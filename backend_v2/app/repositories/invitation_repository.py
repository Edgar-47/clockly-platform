from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import InvitationStatus
from app.models.user_invitation import UserInvitation


class InvitationRepository:
    def __init__(self, db: Session, *, company_id: UUID | None = None) -> None:
        self.db = db
        self.company_id = company_id

    def list_by_company(self, *, include_terminal: bool = True) -> list[UserInvitation]:
        if self.company_id is None:
            return []
        statement = select(UserInvitation).where(UserInvitation.company_id == self.company_id)
        if not include_terminal:
            statement = statement.where(UserInvitation.status == InvitationStatus.PENDING)
        return list(self.db.scalars(statement.order_by(UserInvitation.created_at.desc())))

    def get_by_id(self, invitation_id: UUID) -> UserInvitation | None:
        if self.company_id is None:
            return None
        return self.db.scalar(
            select(UserInvitation).where(
                UserInvitation.id == invitation_id,
                UserInvitation.company_id == self.company_id,
            )
        )

    def get_pending_by_email(self, email: str) -> UserInvitation | None:
        if self.company_id is None:
            return None
        return self.db.scalar(
            select(UserInvitation).where(
                UserInvitation.company_id == self.company_id,
                UserInvitation.email == email.lower(),
                UserInvitation.status == InvitationStatus.PENDING,
            )
        )

    def get_by_token_hash(self, token_hash: str) -> UserInvitation | None:
        return self.db.scalar(select(UserInvitation).where(UserInvitation.token_hash == token_hash))

    def mark_expired_before(self, now: datetime) -> int:
        if self.company_id is None:
            return 0
        invitations = list(
            self.db.scalars(
                select(UserInvitation).where(
                    UserInvitation.company_id == self.company_id,
                    UserInvitation.status == InvitationStatus.PENDING,
                    UserInvitation.expires_at <= now,
                )
            )
        )
        for invitation in invitations:
            invitation.status = InvitationStatus.EXPIRED
            self.db.add(invitation)
        return len(invitations)

    def add(self, invitation: UserInvitation) -> UserInvitation:
        self.db.add(invitation)
        self.db.flush()
        return invitation
