from __future__ import annotations

import re
import secrets
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AuthenticationError, ConflictError, NotFoundError
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_token,
    hash_password,
    verify_password,
)
from app.models.company import Company
from app.models.company_settings import CompanySettings
from app.models.enums import PlanType, UserRole
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.repositories.company_repository import CompanyRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterCompanyRequest
from app.services.audit_log import AuditLogService
from app.services.email_service import PasswordResetEmail, SensitiveChangeEmail
from app.services.plans import apply_plan_to_company
from app.services.permissions import permissions_for_role

PASSWORD_RESET_EXPIRES_MINUTES = 60


@dataclass(frozen=True)
class AuthTokens:
    access_token: str
    refresh_token: str
    expires_in: int
    user: User


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.companies = CompanyRepository(db)
        self.password_resets = PasswordResetRepository(db)

    def register_company(
        self,
        payload: RegisterCompanyRequest,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthTokens:
        email = payload.owner_email.lower()
        if self.users.get_by_email(email) is not None:
            raise ConflictError("A user with this email already exists.")

        slug = _slugify_company_name(payload.company_name)
        if self.companies.get_by_slug(slug) is not None:
            raise ConflictError("A company with this name already exists.")

        company = apply_plan_to_company(
            Company(
                id=uuid.uuid4(),
                name=payload.company_name,
                slug=slug,
                timezone=payload.timezone,
                is_active=True,
            ),
            PlanType.FREE,
        )
        owner = User(
            company_id=company.id,
            email=email,
            full_name=payload.owner_full_name,
            password_hash=hash_password(payload.password),
            role=UserRole.OWNER,
            is_active=True,
        )

        try:
            self.companies.add(company)
            self.users.add(owner)
            company.created_by = owner.id
            self.db.add(
                CompanySettings(
                    company_id=company.id,
                    onboarding_step="company",
                )
            )
            AuditLogService(self.db).record(
                "auth.company_registered",
                company_id=company.id,
                actor_user_id=owner.id,
                resource_type="company",
                resource_id=str(company.id),
                metadata={"plan_type": company.plan_type.value, "owner_email": owner.email},
            )
            return self._issue_tokens(owner, user_agent=user_agent, ip_address=ip_address)
        except IntegrityError as exc:
            self.db.rollback()
            message = str(exc.orig).lower() if exc.orig else ""
            if "slug" in message or "companies" in message:
                raise ConflictError("A company with this name already exists.") from exc
            raise ConflictError("A user with this email already exists.") from exc

    def login(
        self,
        *,
        identifier: str,
        password: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthTokens:
        user = self.users.get_by_email(identifier.lower())
        if user is None or not user.is_active or user.is_deleted or not verify_password(password, user.password_hash):
            AuditLogService(self.db).safe_record(
                "auth.login_failed",
                company_id=user.company_id if user else None,
                actor_user_id=user.id if user else None,
                resource_type="user",
                resource_id=str(user.id) if user else None,
                metadata={"identifier": identifier.lower(), "reason": "invalid_credentials"},
                ip_address=ip_address,
                commit=True,
            )
            raise AuthenticationError("Invalid email or password.")
        company = self.companies.get(user.company_id)
        if company is None:
            raise AuthenticationError("Company is not active.")
        self._assert_user_can_authenticate(user)
        self.users.mark_login(user)
        return self._issue_tokens(user, user_agent=user_agent, ip_address=ip_address)

    def refresh(
        self,
        *,
        refresh_token_value: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthTokens:
        old_token = self.users.get_refresh_token(hash_token(refresh_token_value))
        if old_token is None:
            raise AuthenticationError("Invalid refresh token.")
        if not old_token.is_active:
            if old_token.revoked_at is not None:
                self.users.revoke_active_refresh_tokens_for_user(old_token.user_id)
                AuditLogService(self.db).safe_record(
                    "auth.refresh_reuse_detected",
                    company_id=old_token.company_id,
                    actor_user_id=old_token.user_id,
                    resource_type="refresh_token",
                    resource_id=str(old_token.id),
                    metadata={"replaced_by_token_id": str(old_token.replaced_by_token_id) if old_token.replaced_by_token_id else None},
                )
                self.db.commit()
            raise AuthenticationError("Invalid refresh token.")
        user = self.users.get_active(old_token.user_id, old_token.company_id)
        if user is None:
            raise AuthenticationError("User is not active.")
        self._assert_user_can_authenticate(user)
        tokens = self._issue_tokens(user, user_agent=user_agent, ip_address=ip_address)
        replacement = self.users.get_refresh_token(hash_token(tokens.refresh_token))
        self.users.revoke_refresh_token(
            old_token,
            replacement_id=replacement.id if replacement else None,
        )
        self.db.commit()
        return tokens

    def logout(self, *, refresh_token_value: str | None) -> None:
        if not refresh_token_value:
            self.db.commit()
            return
        refresh_token = self.users.get_refresh_token(hash_token(refresh_token_value))
        if refresh_token is not None and refresh_token.is_active:
            self.users.revoke_refresh_token(refresh_token)
        self.db.commit()

    def request_password_reset(
        self,
        *,
        email: str,
        reset_url: str,
        ip_address: str | None = None,
    ) -> PasswordResetEmail | None:
        user = self.users.get_by_email(email.lower())
        if user is None or not user.is_active:
            self.db.commit()
            return None

        now = datetime.now(UTC)
        token = secrets.token_urlsafe(48)
        self.password_resets.mark_unused_for_user_used(user.id)
        reset = PasswordResetToken(
            company_id=user.company_id,
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=now + timedelta(minutes=PASSWORD_RESET_EXPIRES_MINUTES),
            requested_ip=ip_address,
        )
        self.password_resets.add(reset)
        AuditLogService(self.db).record(
            "auth.password_reset_requested",
            company_id=user.company_id,
            actor_user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
            metadata={"email": user.email},
            ip_address=ip_address,
        )
        self.db.commit()
        return PasswordResetEmail(
            to_email=user.email,
            full_name=user.full_name,
            reset_url=reset_url.format(token=token),
            expires_at=reset.expires_at,
        )

    def reset_password(self, *, token: str, password: str) -> SensitiveChangeEmail:
        reset = self.password_resets.get_by_token_hash(hash_token(token))
        if reset is None:
            raise NotFoundError("Password reset token not found.")
        if reset.used_at is not None:
            raise ConflictError("Password reset token has already been used.")
        expires_at = reset.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= datetime.now(UTC):
            raise ConflictError("Password reset token has expired.")

        user = self.users.get_active(reset.user_id, reset.company_id)
        if user is None:
            raise NotFoundError("User not found.")
        user.password_hash = hash_password(password)
        changed_at = datetime.now(UTC)
        reset.used_at = changed_at
        self.db.add(user)
        self.db.add(reset)
        self.users.revoke_active_refresh_tokens_for_user(user.id)
        AuditLogService(self.db).record(
            "auth.password_reset_completed",
            company_id=user.company_id,
            actor_user_id=user.id,
            resource_type="user",
            resource_id=str(user.id),
        )
        self.db.commit()
        return SensitiveChangeEmail(
            to_email=user.email,
            full_name=user.full_name,
            change_name="password_reset",
            occurred_at=changed_at,
        )

    def _issue_tokens(
        self,
        user: User,
        *,
        user_agent: str | None,
        ip_address: str | None,
    ) -> AuthTokens:
        settings = get_settings()
        access_token = create_access_token(
            user_id=user.id,
            company_id=user.company_id,
            role=user.role.value,
        )
        refresh_token_value = create_refresh_token_value()
        refresh_token = RefreshToken(
            company_id=user.company_id,
            user_id=user.id,
            token_hash=hash_token(refresh_token_value),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self.users.add_refresh_token(refresh_token)
        self.db.commit()
        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token_value,
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )

    def permissions(self, user: User) -> list[str]:
        return permissions_for_role(user.role)

    def _assert_user_can_authenticate(self, user: User) -> None:
        employee = EmployeeRepository(self.db, company_id=user.company_id).get_by_user_id(
            user.id,
            include_inactive=True,
            include_deleted=True,
        )
        if employee is not None:
            if not employee.is_active or employee.is_deleted:
                raise AuthenticationError("Employee profile is not active.")
            return


def _slugify_company_name(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name.strip())
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name).strip("-")
    return slug[:120] or f"company-{secrets.token_hex(4)}"
