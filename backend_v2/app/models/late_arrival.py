from __future__ import annotations

import uuid
from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AttendanceMethod, LateArrivalStatus
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.attendance_session import AttendanceSession
    from app.models.company import Company
    from app.models.employee import Employee
    from app.models.schedule import Schedule
    from app.models.user import User


class LateArrival(TimestampMixin, Base):
    """Records an employee clocking in later than their scheduled entry time.

    Created automatically when a clock-in exceeds the company's grace period.
    grace_period_minutes is snapshotted at creation time so historical records
    remain accurate even if the setting changes later.
    """

    __tablename__ = "late_arrivals"
    __table_args__ = (
        Index("ix_late_arrivals_company_date", "company_id", "date"),
        Index("ix_late_arrivals_company_employee", "company_id", "employee_id"),
        Index("ix_late_arrivals_company_status", "company_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    )
    attendance_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_sessions.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,  # one late-arrival record per session at most
    )
    schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedules.id", ondelete="SET NULL"),
        nullable=True,
    )

    date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_start_time: Mapped[time] = mapped_column(Time, nullable=False)
    actual_clock_in_time: Mapped[time] = mapped_column(Time, nullable=False)

    # Minutes from scheduled start to actual clock-in (always >= 1)
    delay_minutes_total: Mapped[int] = mapped_column(Integer, nullable=False)
    # Minutes exceeding the grace period (delay_minutes_total - grace_period_minutes)
    delay_minutes_after_grace: Mapped[int] = mapped_column(Integer, nullable=False)
    # Snapshot of the grace period at record creation
    grace_period_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    clock_in_method: Mapped[AttendanceMethod | None] = mapped_column(
        enum_column(AttendanceMethod, name="late_arrival_clock_in_method", length=16)
    )

    status: Mapped[LateArrivalStatus] = mapped_column(
        enum_column(LateArrivalStatus, name="late_arrival_status", length=16),
        default=LateArrivalStatus.PENDING,
        nullable=False,
    )
    justification_text: Mapped[str | None] = mapped_column(Text)
    internal_notes: Mapped[str | None] = mapped_column(Text)

    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Whether the underlying session was later corrected by an admin
    is_session_corrected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    company: Mapped[Company] = relationship(foreign_keys=[company_id])
    employee: Mapped[Employee] = relationship(foreign_keys=[employee_id])
    attendance_session: Mapped[AttendanceSession] = relationship(foreign_keys=[attendance_session_id])
    schedule: Mapped[Schedule | None] = relationship(foreign_keys=[schedule_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_user_id])
