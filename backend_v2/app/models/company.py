from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import PlanType
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.attendance_session import AttendanceSession
    from app.models.board import BoardLabel, BoardNote
    from app.models.employee import Employee
    from app.models.company_location import CompanyLocation
    from app.models.company_settings import CompanySettings
    from app.models.schedule import Schedule
    from app.models.salary import SalaryCalculation, SalaryProfile
    from app.models.ticket import Ticket
    from app.models.user import User
    from app.models.user_invitation import UserInvitation


class Company(TimestampMixin, Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    cif: Mapped[str | None] = mapped_column(String(20))
    business_type: Mapped[str | None] = mapped_column(String(80))
    sector: Mapped[str | None] = mapped_column(String(100))
    company_size: Mapped[str | None] = mapped_column(String(40))
    timezone: Mapped[str] = mapped_column(String(80), default="Europe/Madrid", nullable=False)
    country: Mapped[str | None] = mapped_column(String(80))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    plan_type: Mapped[PlanType] = mapped_column(
        enum_column(PlanType, name="plan_type"),
        default=PlanType.FREE,
        nullable=False,
    )
    max_employees: Mapped[int | None] = mapped_column(Integer, default=5)
    has_exports: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_advanced_filters: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_multi_location: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_geolocation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_admin_reports: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_support: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active_subscription: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_beta_user: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(120), unique=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(120), unique=True)
    stripe_subscription_status: Mapped[str | None] = mapped_column(String(80))
    stripe_current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stripe_cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL", use_alter=True),
        nullable=True,
        index=True,
    )

    users: Mapped[list[User]] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
        foreign_keys="User.company_id",
    )
    employees: Mapped[list[Employee]] = relationship(back_populates="company", cascade="all, delete-orphan")
    locations: Mapped[list[CompanyLocation]] = relationship(back_populates="company", cascade="all, delete-orphan")
    schedules: Mapped[list[Schedule]] = relationship(back_populates="company", cascade="all, delete-orphan")
    attendance_sessions: Mapped[list[AttendanceSession]] = relationship(back_populates="company")
    tickets: Mapped[list[Ticket]] = relationship(back_populates="company")
    board_notes: Mapped[list[BoardNote]] = relationship(back_populates="company", cascade="all, delete-orphan")
    board_labels: Mapped[list[BoardLabel]] = relationship(back_populates="company", cascade="all, delete-orphan")
    invitations: Mapped[list[UserInvitation]] = relationship(back_populates="company", cascade="all, delete-orphan")
    salary_profiles: Mapped[list[SalaryProfile]] = relationship(back_populates="company", cascade="all, delete-orphan")
    salary_calculations: Mapped[list[SalaryCalculation]] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
    )
    settings: Mapped[CompanySettings | None] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
        uselist=False,
    )
