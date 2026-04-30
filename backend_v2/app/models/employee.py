from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.attendance_session import AttendanceSession
    from app.models.company import Company
    from app.models.expense_ticket import ExpenseTicket
    from app.models.salary import SalaryProfile
    from app.models.schedule import Schedule
    from app.models.ticket import Ticket
    from app.models.user import User


class Employee(TimestampMixin, Base):
    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("company_id", "dni", name="uq_employees_company_dni"),
        UniqueConstraint("company_id", "user_id", name="uq_employees_company_user"),
        Index("ix_employees_company_active", "company_id", "is_active"),
        Index("ix_employees_company_deleted", "company_id", "is_deleted"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40))
    dni: Mapped[str | None] = mapped_column(String(40))
    role_title: Mapped[str | None] = mapped_column(String(100))
    pin_hash: Mapped[str | None] = mapped_column(String(256))
    hired_on: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    company: Mapped[Company] = relationship(back_populates="employees")
    user: Mapped[User | None] = relationship(back_populates="employee", foreign_keys=[user_id])
    schedule: Mapped[Schedule | None] = relationship(back_populates="employees")
    attendance_sessions: Mapped[list[AttendanceSession]] = relationship(back_populates="employee")
    tickets: Mapped[list[Ticket]] = relationship(back_populates="employee")
    expense_tickets: Mapped[list[ExpenseTicket]] = relationship(back_populates="employee", foreign_keys="ExpenseTicket.employee_id")
    salary_profiles: Mapped[list[SalaryProfile]] = relationship(back_populates="employee", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def has_pin(self) -> bool:
        return bool(self.pin_hash)
