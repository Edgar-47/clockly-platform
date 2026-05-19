from __future__ import annotations

import uuid
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, SmallInteger, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.schedule import Schedule


class ScheduleRule(TimestampMixin, Base):
    """Per-day rule for weekly_custom and flexible_window schedule types.

    weekday: 0=Monday … 6=Sunday (matches Python's datetime.weekday())
    """

    __tablename__ = "schedule_rules"
    __table_args__ = (
        Index("ix_schedule_rules_schedule_id", "schedule_id"),
        Index("ix_schedule_rules_company_id", "company_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedules.id", ondelete="CASCADE"),
        nullable=False,
    )

    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_working_day: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # For fixed/weekly_custom
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)

    # For flexible_window
    entry_window_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    entry_window_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    exit_window_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    exit_window_end: Mapped[time | None] = mapped_column(Time, nullable=True)

    # Per-day grace override (null = use schedule-level grace)
    grace_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    schedule: Mapped[Schedule] = relationship(back_populates="rules")
