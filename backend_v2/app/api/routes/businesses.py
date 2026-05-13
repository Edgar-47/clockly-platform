import hashlib
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.rate_limit import client_ip, invitation_limiter
from app.core.url_builder import build_frontend_url
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.dependencies.email import get_email_service
from app.schemas.invitation import (
    InvitationCreate,
    InvitationCreateResponse,
    InvitationListResponse,
    InvitationRead,
)
from app.schemas.user import UserListResponse, UserRead, UserRoleUpdate
from app.services.email_service import EmailService, InvitationEmail
from app.services.invitation_service import InvitationService, MemberService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.get("/{business_id}/members", response_model=UserListResponse)
def list_members(
    business_id: UUID,
    include_inactive: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserListResponse:
    _assert_current_business(ctx, business_id)
    items, total = MemberService(db, company_id=ctx.company_id).list_members(
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return UserListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("/{business_id}/invitations", response_model=InvitationCreateResponse, status_code=status.HTTP_201_CREATED)
def create_invitation(
    business_id: UUID,
    payload: InvitationCreate,
    request: Request,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    email_service: EmailService = Depends(get_email_service),
    db: Session = Depends(get_db),
) -> InvitationCreateResponse:
    _assert_current_business(ctx, business_id)
    _limit_invitation_create(request, ctx.user.email)
    result = InvitationService(db, company_id=ctx.company_id).create_invitation(payload, actor=ctx.user)
    invitation = InvitationRead.model_validate(result.invitation)
    acceptance_url = _acceptance_url(request, result.acceptance_token)
    try:
        email_service.send_invitation_email(
            InvitationEmail(
                to_email=invitation.email,
                company_name=ctx.company.name,
                invited_by_name=ctx.user.full_name,
                role=invitation.role,
                acceptance_url=acceptance_url,
                expires_at=invitation.expires_at,
            )
        )
    except Exception:
        logger.exception(
            "Invitation email delivery failed.",
            extra={"company_id": str(ctx.company_id), "invitation_id": str(invitation.id)},
        )
    return InvitationCreateResponse(
        **invitation.model_dump(),
        acceptance_url=acceptance_url,
    )


@router.get("/{business_id}/invitations", response_model=InvitationListResponse)
def list_invitations(
    business_id: UUID,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> InvitationListResponse:
    _assert_current_business(ctx, business_id)
    invitations = InvitationService(db, company_id=ctx.company_id).list_invitations()
    return InvitationListResponse(items=invitations)


@router.delete("/{business_id}/invitations/{invitation_id}", response_model=InvitationRead)
def revoke_invitation(
    business_id: UUID,
    invitation_id: UUID,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> InvitationRead:
    _assert_current_business(ctx, business_id)
    return InvitationService(db, company_id=ctx.company_id).revoke_invitation(invitation_id, actor=ctx.user)


@router.post("/{business_id}/members/{user_id}/role", response_model=UserRead)
def change_member_role(
    business_id: UUID,
    user_id: UUID,
    payload: UserRoleUpdate,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    _assert_current_business(ctx, business_id)
    return MemberService(db, company_id=ctx.company_id).change_role(user_id, payload.role, actor=ctx.user)


@router.delete("/{business_id}/members/{user_id}", response_model=UserRead)
def revoke_member_access(
    business_id: UUID,
    user_id: UUID,
    ctx: TenantContext = Depends(require_permission("users:manage")),
    db: Session = Depends(get_db),
) -> UserRead:
    _assert_current_business(ctx, business_id)
    return MemberService(db, company_id=ctx.company_id).revoke_access(user_id, actor=ctx.user)


def _assert_current_business(ctx: TenantContext, business_id: UUID) -> None:
    if business_id != ctx.company_id:
        raise NotFoundError("Business not found.")


def _acceptance_url(request: Request, token: str) -> str:
    return build_frontend_url(f"/accept-invitation/{token}")


def _limit_invitation_create(request: Request, actor_email: str) -> None:
    invitation_limiter.check(f"ip:{client_ip(request)}")
    digest = hashlib.sha256(actor_email.lower().encode("utf-8")).hexdigest()
    invitation_limiter.check(f"actor:{digest}")
