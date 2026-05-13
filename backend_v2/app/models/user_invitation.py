from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import InvitationStatus, UserRole
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User


class UserInvitation(TimestampMixin, Base):
    __tablename__ = "user_invitations"
    __table_args__ = (
        Index("ix_user_invitations_company_status", "company_id", "status"),
        Index("ix_user_invitations_token_hash", "token_hash", unique=True),
        Index(
            "uq_user_invitations_company_email_pending",
            "company_id",
            "email",
            unique=True,
            postgresql_where=text("status = 'pending'"),
            sqlite_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(enum_column(UserRole, name="user_role"), nullable=False)
    invited_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[InvitationStatus] = mapped_column(
        enum_column(InvitationStatus, name="invitation_status"),
        default=InvitationStatus.PENDING,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    company: Mapped[Company] = relationship(back_populates="invitations")
    invited_by: Mapped[User] = relationship(foreign_keys=[invited_by_user_id])
