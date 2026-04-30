from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ExpenseEventType
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.expense_ticket import ExpenseTicket
    from app.models.user import User


class ExpenseTicketEvent(TimestampMixin, Base):
    __tablename__ = "expense_ticket_events"
    __table_args__ = (
        Index("ix_expense_ticket_events_ticket_id", "ticket_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("expense_tickets.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    event_type: Mapped[ExpenseEventType] = mapped_column(
        enum_column(ExpenseEventType, name="expense_event_type", length=40),
        nullable=False,
    )
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    ticket: Mapped[ExpenseTicket] = relationship(back_populates="events")
    user: Mapped[User | None] = relationship(foreign_keys=[user_id])
