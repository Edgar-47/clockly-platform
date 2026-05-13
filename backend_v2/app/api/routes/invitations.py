import hashlib

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.rate_limit import client_ip, invitation_limiter
from app.db.session import get_db
from app.schemas.invitation import (
    InvitationAccept,
    InvitationAcceptByToken,
    InvitationAcceptResponse,
    InvitationPreviewResponse,
    InvitationRead,
)
from app.services.invitation_service import InvitationService


router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("/{token}", response_model=InvitationPreviewResponse)
def preview_invitation(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> InvitationPreviewResponse:
    _limit_invitation(request, token)
    invitation = InvitationService(db).preview_invitation(token)
    return InvitationPreviewResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        company_name=invitation.company.name,
        status=invitation.status,
        expires_at=invitation.expires_at,
    )


@router.post("/accept", response_model=InvitationAcceptResponse)
def accept_invitation_by_body(
    payload: InvitationAcceptByToken,
    request: Request,
    db: Session = Depends(get_db),
) -> InvitationAcceptResponse:
    _limit_invitation(request, payload.token)
    invitation = InvitationService(db).accept_invitation(payload.token, payload)
    return InvitationAcceptResponse(invitation=InvitationRead.model_validate(invitation))


@router.post("/{token}/accept", response_model=InvitationAcceptResponse)
def accept_invitation(
    token: str,
    payload: InvitationAccept,
    request: Request,
    db: Session = Depends(get_db),
) -> InvitationAcceptResponse:
    _limit_invitation(request, token)
    invitation = InvitationService(db).accept_invitation(token, payload)
    return InvitationAcceptResponse(invitation=InvitationRead.model_validate(invitation))


def _limit_invitation(request: Request, token: str | None = None) -> None:
    invitation_limiter.check(f"ip:{client_ip(request)}")
    if token:
        digest = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
        invitation_limiter.check(f"token:{digest}")
