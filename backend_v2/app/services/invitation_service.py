from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDenied
from app.core.security import hash_password, hash_token
from app.models.employee import Employee
from app.models.enums import InvitationStatus, UserRole
from app.models.user import User
from app.models.user_invitation import UserInvitation
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.invitation_repository import InvitationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.invitation import InvitationAccept, InvitationCreate
from app.services.audit_log import AuditLogService
from app.services.plans import check_employee_limit

INVITATION_EXPIRES_DAYS = 7

_INVITABLE_ROLES: dict[UserRole, set[UserRole]] = {
    UserRole.OWNER: {UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
    UserRole.ADMIN: {UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
}

_MANAGEABLE_ROLES: dict[UserRole, set[UserRole]] = {
    UserRole.OWNER: {UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
    UserRole.ADMIN: {UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE},
}


@dataclass(frozen=True)
class InvitationCreateResult:
    invitation: UserInvitation
    acceptance_token: str


class InvitationService:
    def __init__(self, db: Session, *, company_id: UUID | None = None) -> None:
        self.db = db
        self.company_id = company_id
        self.invitations = InvitationRepository(db, company_id=company_id)
        self.users = UserRepository(db)

    def list_invitations(self) -> list[UserInvitation]:
        self._expire_pending_invitations()
        self.db.commit()
        return self.invitations.list_by_company()

    def create_invitation(self, payload: InvitationCreate, *, actor: User) -> InvitationCreateResult:
        self._assert_actor_can_invite(actor, payload.role)
        self._expire_pending_invitations()

        email = payload.email.lower().strip()
        existing_user = self.users.get_by_email(email)
        if existing_user is not None:
            raise ConflictError("A user with this email already exists.")

        existing_invitation = self.invitations.get_pending_by_email(email)
        if existing_invitation is not None:
            raise ConflictError("A pending invitation already exists for this email.")

        token = secrets.token_urlsafe(48)
        invitation = UserInvitation(
            company_id=actor.company_id,
            email=email,
            role=payload.role,
            invited_by_user_id=actor.id,
            token_hash=hash_token(token),
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(UTC) + timedelta(days=INVITATION_EXPIRES_DAYS),
        )
        try:
            self.invitations.add(invitation)
            AuditLogService(self.db).record(
                "invitation.created",
                company_id=actor.company_id,
                actor_user_id=actor.id,
                resource_type="user_invitation",
                resource_id=str(invitation.id),
                metadata={"email": invitation.email, "role": invitation.role.value},
            )
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("A pending invitation already exists for this email.") from exc
        return InvitationCreateResult(invitation=invitation, acceptance_token=token)

    def preview_invitation(self, token: str) -> UserInvitation:
        invitation = self.invitations.get_by_token_hash(hash_token(token))
        if invitation is None:
            raise NotFoundError("Invitation not found.")
        self._mark_expired_if_needed(invitation)
        self.db.commit()
        return invitation

    def revoke_invitation(self, invitation_id: UUID, *, actor: User) -> UserInvitation:
        self._assert_actor_can_manage_members(actor)
        invitation = self.invitations.get_by_id(invitation_id)
        if invitation is None:
            raise NotFoundError("Invitation not found.")
        if invitation.status != InvitationStatus.PENDING:
            raise ConflictError("Only pending invitations can be revoked.")
        invitation.status = InvitationStatus.REVOKED
        self.db.add(invitation)
        AuditLogService(self.db).record(
            "invitation.revoked",
            company_id=actor.company_id,
            actor_user_id=actor.id,
            resource_type="user_invitation",
            resource_id=str(invitation.id),
            metadata={"email": invitation.email, "role": invitation.role.value},
        )
        self.db.commit()
        return invitation

    def accept_invitation(self, token: str, payload: InvitationAccept) -> UserInvitation:
        invitation = self.invitations.get_by_token_hash(hash_token(token))
        if invitation is None:
            raise NotFoundError("Invitation not found.")
        if invitation.status != InvitationStatus.PENDING:
            raise ConflictError("Invitation cannot be reused.")

        now = datetime.now(UTC)
        self._raise_if_expired(invitation, now)

        existing_user = self.users.get_by_email(invitation.email)
        if existing_user is not None:
            raise ConflictError("A user with this email already exists.")

        employee_repo = EmployeeRepository(self.db, company_id=invitation.company_id)
        employee_profile = None
        if invitation.role == UserRole.EMPLOYEE:
            employee_profile = employee_repo.get_by_email(invitation.email, include_inactive=True)
            if employee_profile is not None and employee_profile.user_id is not None:
                raise ConflictError("An employee with this email is already linked to another user.")
            if employee_profile is None or not employee_profile.is_active:
                check_employee_limit(
                    self.db,
                    invitation.company_id,
                    actor_user_id=invitation.invited_by_user_id,
                )

        user = User(
            company_id=invitation.company_id,
            email=invitation.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            role=invitation.role,
            is_active=True,
        )
        try:
            self.users.add(user)
            if invitation.role == UserRole.EMPLOYEE:
                self._create_or_link_employee_profile(
                    employee_repo,
                    invitation=invitation,
                    user=user,
                    full_name=payload.full_name,
                    existing_employee=employee_profile,
                )
            invitation.status = InvitationStatus.ACCEPTED
            invitation.accepted_at = now
            self.db.add(invitation)
            AuditLogService(self.db).record(
                "invitation.accepted",
                company_id=invitation.company_id,
                actor_user_id=user.id,
                resource_type="user_invitation",
                resource_id=str(invitation.id),
                metadata={"email": invitation.email, "role": invitation.role.value},
            )
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("A user with this email already exists.") from exc
        return invitation

    def _create_or_link_employee_profile(
        self,
        employee_repo: EmployeeRepository,
        *,
        invitation: UserInvitation,
        user: User,
        full_name: str,
        existing_employee: Employee | None,
    ) -> Employee:
        if existing_employee is not None:
            existing_employee.user_id = user.id
            existing_employee.email = invitation.email
            existing_employee.is_active = True
            self.db.add(existing_employee)
            return existing_employee

        first_name, last_name = _split_employee_name(full_name)
        employee = Employee(
            company_id=invitation.company_id,
            user_id=user.id,
            first_name=first_name,
            last_name=last_name,
            email=invitation.email,
            is_active=True,
        )
        return employee_repo.add(employee)

    def _expire_pending_invitations(self) -> None:
        self.invitations.mark_expired_before(datetime.now(UTC))

    def _mark_expired_if_needed(self, invitation: UserInvitation) -> None:
        if invitation.status != InvitationStatus.PENDING:
            return
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= datetime.now(UTC):
            invitation.status = InvitationStatus.EXPIRED
            self.db.add(invitation)

    def _raise_if_expired(self, invitation: UserInvitation, now: datetime) -> None:
        expires_at = invitation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= now:
            invitation.status = InvitationStatus.EXPIRED
            self.db.add(invitation)
            self.db.commit()
            raise ConflictError("Invitation has expired.")

    def _assert_actor_can_invite(self, actor: User, target_role: UserRole) -> None:
        self._assert_actor_can_manage_members(actor)
        allowed = _INVITABLE_ROLES.get(actor.role, set())
        if target_role not in allowed:
            raise PermissionDenied(
                f"Your role ({actor.role.value}) cannot invite '{target_role.value}'."
            )

    def _assert_actor_can_manage_members(self, actor: User) -> None:
        if actor.role == UserRole.SUPERADMIN:
            raise PermissionDenied("Superadmin users cannot use tenant member management.")
        if actor.role not in {UserRole.OWNER, UserRole.ADMIN}:
            raise PermissionDenied("Only owner and admin users can manage invitations.")


def _split_employee_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split()
    if len(parts) <= 1:
        return full_name.strip()[:80], "Empleado"
    return parts[0][:80], " ".join(parts[1:])[:120]


class MemberService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.users = UserRepository(db)

    def list_members(
        self,
        *,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> tuple[list[User], int]:
        return (
            self.users.list_by_company(
                self.company_id,
                include_inactive=include_inactive,
                limit=limit,
                offset=offset,
            ),
            self.users.count_by_company(self.company_id, include_inactive=include_inactive),
        )

    def change_role(self, user_id: UUID, target_role: UserRole, *, actor: User) -> User:
        target = self._get_target(user_id)
        self._assert_can_manage_target(actor, target)
        self._assert_can_assign_role(actor, target_role)
        self._assert_not_last_owner(target, changing_to=target_role)

        previous_role = target.role
        target.role = target_role
        self.db.add(target)
        AuditLogService(self.db).record(
            "member.role_changed",
            company_id=actor.company_id,
            actor_user_id=actor.id,
            resource_type="user",
            resource_id=str(target.id),
            metadata={"from_role": previous_role.value, "to_role": target_role.value},
        )
        self.db.commit()
        return target

    def revoke_access(self, user_id: UUID, *, actor: User) -> User:
        target = self._get_target(user_id)
        self._assert_can_manage_target(actor, target)
        self._assert_not_last_owner(target, changing_to=None)

        target.is_active = False
        self.db.add(target)
        AuditLogService(self.db).record(
            "member.access_revoked",
            company_id=actor.company_id,
            actor_user_id=actor.id,
            resource_type="user",
            resource_id=str(target.id),
            metadata={"target_role": target.role.value, "target_email": target.email},
        )
        self.db.commit()
        return target

    def _get_target(self, user_id: UUID) -> User:
        target = self.users.get_by_id_in_company(user_id, self.company_id)
        if target is None:
            raise NotFoundError("Member not found.")
        return target

    def _assert_can_manage_target(self, actor: User, target: User) -> None:
        if actor.role == UserRole.SUPERADMIN:
            raise PermissionDenied("Superadmin users cannot use tenant member management.")
        if actor.id == target.id:
            raise PermissionDenied("You cannot modify your own role or access.")
        allowed_targets = _MANAGEABLE_ROLES.get(actor.role, set())
        if target.role not in allowed_targets:
            raise PermissionDenied(
                f"Your role ({actor.role.value}) cannot modify '{target.role.value}' members."
            )

    def _assert_can_assign_role(self, actor: User, target_role: UserRole) -> None:
        allowed_roles = _MANAGEABLE_ROLES.get(actor.role, set())
        if target_role not in allowed_roles:
            raise PermissionDenied(
                f"Your role ({actor.role.value}) cannot assign '{target_role.value}'."
            )

    def _assert_not_last_owner(self, target: User, *, changing_to: UserRole | None) -> None:
        if target.role != UserRole.OWNER:
            return
        if changing_to == UserRole.OWNER:
            return
        owners = self.users.count_by_company_and_role(
            self.company_id,
            UserRole.OWNER,
            include_inactive=False,
        )
        if owners <= 1:
            raise PermissionDenied("The last owner cannot be demoted or revoked.")
