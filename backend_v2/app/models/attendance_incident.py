from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AttendanceIncidentType, IncidentStatus
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.attendance_session import AttendanceSession
    from app.models.company import Company
    from app.models.employee import Employee


class AttendanceIncident(TimestampMixin, Base):
    __tablename__ = "attendance_incidents"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "attendance_session_id",
            "type",
            name="uq_attendance_incidents_session_type",
        ),
        Index("ix_attendance_incidents_company_type", "company_id", "type"),
        Index("ix_attendance_incidents_company_status", "company_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )
    attendance_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[AttendanceIncidentType] = mapped_column(
        enum_column(AttendanceIncidentType, name="attendance_incident_type", length=40),
        nullable=False,
    )
    status: Mapped[IncidentStatus] = mapped_column(
        enum_column(IncidentStatus, name="incident_status", length=24),
        default=IncidentStatus.OPEN,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_json: Mapped[dict | None] = mapped_column(JSON)

    company: Mapped[Company] = relationship()
    employee: Mapped[Employee] = relationship()
    attendance_session: Mapped[AttendanceSession] = relationship(back_populates="incidents")
