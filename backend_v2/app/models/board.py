from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import BoardNotePriority, BoardNoteStatus
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User


BOARD_LABEL_COLORS = (
    "blue",
    "green",
    "orange",
    "red",
    "purple",
    "pink",
    "gray",
    "yellow",
    "cyan",
)

board_note_labels = Table(
    "board_note_labels",
    Base.metadata,
    Column(
        "note_id",
        UUID(as_uuid=True),
        ForeignKey("board_notes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "label_id",
        UUID(as_uuid=True),
        ForeignKey("board_labels.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class BoardNote(TimestampMixin, Base):
    __tablename__ = "board_notes"
    __table_args__ = (
        Index("ix_board_notes_company_status", "company_id", "status"),
        Index("ix_board_notes_company_priority", "company_id", "priority"),
        Index("ix_board_notes_company_reminder", "company_id", "reminder_at"),
        Index("ix_board_notes_company_created", "company_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    status: Mapped[BoardNoteStatus] = mapped_column(
        enum_column(BoardNoteStatus, name="board_note_status"),
        default=BoardNoteStatus.PENDING,
        nullable=False,
    )
    priority: Mapped[BoardNotePriority] = mapped_column(
        enum_column(BoardNotePriority, name="board_note_priority"),
        default=BoardNotePriority.MEDIUM,
        nullable=False,
    )
    reminder_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    company: Mapped[Company] = relationship(back_populates="board_notes")
    author: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    labels: Mapped[list[BoardLabel]] = relationship(
        secondary=board_note_labels,
        back_populates="notes",
        lazy="selectin",
    )


class BoardLabel(TimestampMixin, Base):
    __tablename__ = "board_labels"
    __table_args__ = (
        CheckConstraint(
            f"color in ({', '.join(repr(color) for color in BOARD_LABEL_COLORS)})",
            name="board_label_color_allowed",
        ),
        Index("ix_board_labels_company", "company_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    color: Mapped[str] = mapped_column(String(24), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    company: Mapped[Company] = relationship(back_populates="board_labels")
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    notes: Mapped[list[BoardNote]] = relationship(
        secondary=board_note_labels,
        back_populates="labels",
    )


Index(
    "uq_board_labels_company_lower_name",
    BoardLabel.company_id,
    func.lower(BoardLabel.name),
    unique=True,
)
