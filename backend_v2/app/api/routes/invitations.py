from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

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
    db: Session = Depends(get_db),
) -> InvitationPreviewResponse:
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
    db: Session = Depends(get_db),
) -> InvitationAcceptResponse:
    invitation = InvitationService(db).accept_invitation(payload.token, payload)
    return InvitationAcceptResponse(invitation=InvitationRead.model_validate(invitation))


@router.post("/{token}/accept", response_model=InvitationAcceptResponse)
def accept_invitation(
    token: str,
    payload: InvitationAccept,
    db: Session = Depends(get_db),
) -> InvitationAcceptResponse:
    invitation = InvitationService(db).accept_invitation(token, payload)
    return InvitationAcceptResponse(invitation=InvitationRead.model_validate(invitation))
