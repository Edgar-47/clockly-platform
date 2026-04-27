from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.invitation import InvitationAccept, InvitationAcceptResponse, InvitationRead
from app.services.invitation_service import InvitationService


router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post("/{token}/accept", response_model=InvitationAcceptResponse)
def accept_invitation(
    token: str,
    payload: InvitationAccept,
    db: Session = Depends(get_db),
) -> InvitationAcceptResponse:
    invitation = InvitationService(db).accept_invitation(token, payload)
    return InvitationAcceptResponse(invitation=InvitationRead.model_validate(invitation))
