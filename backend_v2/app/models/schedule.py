from __future__ import annotations

import uuid
from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.employee import Employee


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

    monday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    tuesday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    wednesday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    thursday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    friday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    saturday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sunday: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    entry_time: Mapped[time] = mapped_column(Time, nullable=False)
    exit_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped[Company] = relationship(back_populates="schedules")
    employees: Mapped[list[Employee]] = relationship(back_populates="schedule")

    @property
    def working_days_count(self) -> int:
        return sum([
            self.monday, self.tuesday, self.wednesday, self.thursday,
            self.friday, self.saturday, self.sunday,
        ])

    @property
    def net_hours(self) -> float:
        total_minutes = (
            self.exit_time.hour * 60 + self.exit_time.minute
            - (self.entry_time.hour * 60 + self.entry_time.minute)
            - self.break_minutes
        )
        return round(max(total_minutes, 0) / 60, 2)

    @property
    def weekly_hours(self) -> float:
        return round(self.net_hours * self.working_days_count, 2)
