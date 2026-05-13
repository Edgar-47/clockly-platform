from __future__ import annotations

import uuid
from datetime import datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company


class CompanySettings(TimestampMixin, Base):
    __tablename__ = "company_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    onboarding_step: Mapped[str] = mapped_column(String(40), default="company", nullable=False)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_employee_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    kiosk_pin_configured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invitations_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    auto_close_open_sessions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_close_after_hours: Mapped[int] = mapped_column(Integer, default=16, nullable=False)
    auto_clock_out_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_clock_out_time: Mapped[time | None] = mapped_column(Time())
    auto_clock_out_timezone: Mapped[str | None] = mapped_column(String(80))
    auto_clock_out_grace_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    auto_clock_out_updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
    )
    auto_clock_out_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Late arrival detection settings
    late_arrivals_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    late_arrival_grace_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    company: Mapped[Company] = relationship(back_populates="settings")
