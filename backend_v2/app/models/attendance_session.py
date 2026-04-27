from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AttendanceMethod, AttendanceStatus, LocationPermissionStatus, LocationSource, LocationStatus
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.employee import Employee


class AttendanceSession(TimestampMixin, Base):
    __tablename__ = "attendance_sessions"
    __table_args__ = (
        CheckConstraint("duration_seconds IS NULL OR duration_seconds >= 0", name="duration_non_negative"),
        CheckConstraint("clock_out IS NULL OR clock_out >= clock_in", name="clock_out_after_clock_in"),
        Index(
            "uq_attendance_sessions_one_open_per_employee",
            "company_id",
            "employee_id",
            unique=True,
            postgresql_where=text("status = 'open'"),
        ),
        Index("ix_attendance_sessions_company_clock_in", "company_id", "clock_in"),
        Index("ix_attendance_sessions_company_status", "company_id", "status"),
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
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    clock_in: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    clock_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[AttendanceStatus] = mapped_column(
        enum_column(AttendanceStatus, name="attendance_status"),
        default=AttendanceStatus.OPEN,
        nullable=False,
    )
    method: Mapped[AttendanceMethod] = mapped_column(
        enum_column(AttendanceMethod, name="attendance_method"),
        default=AttendanceMethod.WEB,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    source: Mapped[str | None] = mapped_column(String(40))

    # Geolocation — clock-in
    clock_in_latitude: Mapped[float | None] = mapped_column(Float)
    clock_in_longitude: Mapped[float | None] = mapped_column(Float)
    clock_in_accuracy_meters: Mapped[float | None] = mapped_column(Float)
    clock_in_location_status: Mapped[LocationStatus | None] = mapped_column(
        enum_column(LocationStatus, name="location_status_in", length=16)
    )
    clock_in_distance_meters: Mapped[float | None] = mapped_column(Float)

    # Geolocation — clock-out
    clock_out_latitude: Mapped[float | None] = mapped_column(Float)
    clock_out_longitude: Mapped[float | None] = mapped_column(Float)
    clock_out_accuracy_meters: Mapped[float | None] = mapped_column(Float)
    clock_out_location_status: Mapped[LocationStatus | None] = mapped_column(
        enum_column(LocationStatus, name="location_status_out", length=16)
    )
    clock_out_distance_meters: Mapped[float | None] = mapped_column(Float)

    # Geolocation — meta
    location_source: Mapped[LocationSource] = mapped_column(
        enum_column(LocationSource, name="location_source_enum", length=16),
        default=LocationSource.UNKNOWN,
        nullable=False,
    )
    location_permission_status: Mapped[LocationPermissionStatus] = mapped_column(
        enum_column(LocationPermissionStatus, name="location_permission_status_enum", length=16),
        default=LocationPermissionStatus.UNKNOWN,
        nullable=False,
    )

    company: Mapped[Company] = relationship(back_populates="attendance_sessions")
    employee: Mapped[Employee] = relationship(back_populates="attendance_sessions")

