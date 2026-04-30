from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import ExpenseCategory, ExpenseStatus, PaymentSource
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.company_location import CompanyLocation
    from app.models.employee import Employee
    from app.models.expense_ticket_event import ExpenseTicketEvent
    from app.models.user import User


class ExpenseTicket(TimestampMixin, Base):
    __tablename__ = "expense_tickets"
    __table_args__ = (
        Index("ix_expense_tickets_company_status", "company_id", "status"),
        Index("ix_expense_tickets_company_employee", "company_id", "employee_id"),
        Index("ix_expense_tickets_company_date", "company_id", "purchase_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_locations.id", ondelete="SET NULL"),
    )
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[ExpenseCategory] = mapped_column(
        enum_column(ExpenseCategory, name="expense_category"),
        nullable=False,
    )
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    payment_source: Mapped[PaymentSource] = mapped_column(
        enum_column(PaymentSource, name="payment_source"),
        nullable=False,
    )

    requires_reimbursement: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reimbursement_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    status: Mapped[ExpenseStatus] = mapped_column(
        enum_column(ExpenseStatus, name="expense_status"),
        default=ExpenseStatus.PENDING,
        nullable=False,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    internal_notes: Mapped[str | None] = mapped_column(Text)

    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rejected_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    paid_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    attachment_url: Mapped[str | None] = mapped_column(String(500))
    attachment_file_name: Mapped[str | None] = mapped_column(String(255))
    attachment_mime_type: Mapped[str | None] = mapped_column(String(100))
    attachment_size: Mapped[int | None] = mapped_column(Integer)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    company: Mapped[Company] = relationship(foreign_keys=[company_id])
    location: Mapped[CompanyLocation | None] = relationship(foreign_keys=[location_id])
    employee: Mapped[Employee | None] = relationship(foreign_keys=[employee_id], back_populates="expense_tickets")
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    approved_by: Mapped[User | None] = relationship(foreign_keys=[approved_by_user_id])
    rejected_by: Mapped[User | None] = relationship(foreign_keys=[rejected_by_user_id])
    paid_by: Mapped[User | None] = relationship(foreign_keys=[paid_by_user_id])
    events: Mapped[list[ExpenseTicketEvent]] = relationship(
        back_populates="ticket",
        order_by="ExpenseTicketEvent.created_at",
        cascade="all, delete-orphan",
    )
