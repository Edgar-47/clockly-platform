from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Index, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import SalaryType
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.employee import Employee
    from app.models.user import User


class SalaryProfile(TimestampMixin, Base):
    __tablename__ = "salary_profiles"
    __table_args__ = (
        Index("ix_salary_profiles_company_employee", "company_id", "employee_id"),
        Index("ix_salary_profiles_company_effective", "company_id", "effective_from", "effective_to"),
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
    salary_type: Mapped[SalaryType] = mapped_column(
        enum_column(SalaryType, name="salary_type", length=24),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    notes: Mapped[str | None] = mapped_column(Text)

    company: Mapped[Company] = relationship(back_populates="salary_profiles")
    employee: Mapped[Employee] = relationship(back_populates="salary_profiles")
    created_by: Mapped[User | None] = relationship()


class SalaryCalculation(TimestampMixin, Base):
    __tablename__ = "salary_calculations"
    __table_args__ = (
        Index("ix_salary_calculations_company_employee", "company_id", "employee_id"),
        Index("ix_salary_calculations_company_period", "company_id", "period_start", "period_end"),
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
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    gross_estimated_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_hours: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_days: Mapped[int] = mapped_column(nullable=False)
    total_shifts: Mapped[int] = mapped_column(nullable=False)
    generated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)

    company: Mapped[Company] = relationship(back_populates="salary_calculations")
    employee: Mapped[Employee] = relationship()
    generated_by: Mapped[User | None] = relationship()
