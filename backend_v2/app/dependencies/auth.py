from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.auth_cookies import ACCESS_COOKIE_NAME
from app.core.errors import AuthenticationError, PermissionDenied
from app.core.security import TokenDecodeError, decode_access_token
from app.db.session import get_db
from app.models.company import Company
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.company_repository import CompanyRepository
from app.repositories.user_repository import UserRepository
from app.services.permissions import is_admin_role, permissions_for_role, role_has_permission
from app.services.audit_log import AuditLogService


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class TenantContext:
    user: User
    company: Company

    @property
    def company_id(self):
        return self.company.id

    @property
    def permissions(self) -> list[str]:
        return permissions_for_role(self.user.role)

    @property
    def is_admin(self) -> bool:
        return is_admin_role(self.user.role)

    @property
    def is_superadmin(self) -> bool:
        return self.user.role == UserRole.SUPERADMIN


def get_current_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> TenantContext:
    token = _access_token_from_request(request, credentials)
    if token is None:
        raise AuthenticationError("Missing authentication token.")
    try:
        payload = decode_access_token(token)
        user_id = UUID(str(payload["sub"]))
        company_id = UUID(str(payload["company_id"]))
    except (KeyError, ValueError, TokenDecodeError) as exc:
        raise AuthenticationError("Invalid authentication token.") from exc

    user = UserRepository(db).get_active(user_id, company_id)
    company = CompanyRepository(db).get(company_id)
    if user is None or company is None:
        raise AuthenticationError("User or company is not active.")
    return TenantContext(user=user, company=company)


def require_permission(permission: str):
    def dependency(
        ctx: TenantContext = Depends(get_current_context),
        db: Session = Depends(get_db),
    ) -> TenantContext:
        if not role_has_permission(ctx.user.role, permission):
            AuditLogService(db).safe_record(
                "permissions.denied",
                company_id=ctx.company_id,
                actor_user_id=ctx.user.id,
                resource_type="permission",
                resource_id=permission,
                metadata={"role": ctx.user.role.value},
                commit=True,
            )
            raise PermissionDenied("Insufficient permissions.")
        return ctx

    return dependency


def require_superadmin():
    """Restrict endpoint exclusively to the SUPERADMIN role."""
    def dependency(ctx: TenantContext = Depends(get_current_context)) -> TenantContext:
        if ctx.user.role != UserRole.SUPERADMIN:
            raise PermissionDenied("Superadmin access required.")
        return ctx

    return dependency


def require_admin():
    """Restrict endpoint to tenant admin roles. Superadmin is reserved for internal console access."""
    def dependency(ctx: TenantContext = Depends(get_current_context)) -> TenantContext:
        if not is_admin_role(ctx.user.role):
            raise PermissionDenied("Admin access required.")
        return ctx

    return dependency


def _access_token_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    if credentials is not None and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    return request.cookies.get(ACCESS_COOKIE_NAME)
