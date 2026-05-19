from __future__ import annotations

import uuid
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum as SaEnum, ForeignKey, Index, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ScheduleType

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.employee import Employee
    from app.models.schedule_rule import ScheduleRule


class Schedule(TimestampMixin, Base):
    __tablename__ = "schedules"
    __table_args__ = (
        Index("ix_schedules_company_active", "company_id", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    schedule_type: Mapped[ScheduleType] = mapped_column(
        SaEnum(ScheduleType, name="scheduletype", create_type=False),
        nullable=False,
        default=ScheduleType.FIXED,
        server_default=ScheduleType.FIXED.value,
    )

    # Working days (used by fixed type; weekly_custom uses rules)
    monday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tuesday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    wednesday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    thursday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    friday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    saturday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sunday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Used by fixed and weekly_custom (at schedule level for fixed)
    entry_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    exit_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Flexible window (at schedule level; can also be per-rule)
    entry_window_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    entry_window_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    exit_window_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    exit_window_end: Mapped[time | None] = mapped_column(Time, nullable=True)

    # Grace period in minutes (overrides company setting when set)
    grace_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped[Company] = relationship(back_populates="schedules")
    employees: Mapped[list[Employee]] = relationship(back_populates="schedule")
    rules: Mapped[list[ScheduleRule]] = relationship(
        back_populates="schedule",
        cascade="all, delete-orphan",
        order_by="ScheduleRule.weekday",
    )

    @property
    def working_days_count(self) -> int:
        return sum([
            self.monday, self.tuesday, self.wednesday, self.thursday,
            self.friday, self.saturday, self.sunday,
        ])

    @property
    def net_hours(self) -> float:
        if self.entry_time is None or self.exit_time is None:
            return 0.0
        total_minutes = (
            self.exit_time.hour * 60 + self.exit_time.minute
            - (self.entry_time.hour * 60 + self.entry_time.minute)
            - self.break_minutes
        )
        return round(max(total_minutes, 0) / 60, 2)

    @property
    def weekly_hours(self) -> float:
        return round(self.net_hours * self.working_days_count, 2)
