from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import CashClosureShift
from app.models.types import enum_column

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.company_location import CompanyLocation
    from app.models.user import User


class CashClosure(TimestampMixin, Base):
    __tablename__ = "cash_closures"
    __table_args__ = (
        Index("ix_cash_closures_company_date", "company_id", "date"),
        Index("ix_cash_closures_company_location", "company_id", "location_id"),
        Index("ix_cash_closures_company_user", "company_id", "closed_by_user_id"),
        Index("ix_cash_closures_company_incidence", "company_id", "has_incidence"),
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
        nullable=True,
    )
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_edited_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    date: Mapped[date] = mapped_column(Date, nullable=False)
    shift: Mapped[CashClosureShift] = mapped_column(
        enum_column(CashClosureShift, name="cash_closure_shift", length=16),
        nullable=False,
    )
    custom_shift_name: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)

    theoretical_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    real_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    has_incidence: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    incidence_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    incidence_comment: Mapped[str | None] = mapped_column(Text)

    signature_name: Mapped[str] = mapped_column(String(160), nullable=False)
    signed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    locked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    company: Mapped[Company] = relationship(foreign_keys=[company_id])
    location: Mapped[CompanyLocation | None] = relationship(foreign_keys=[location_id])
    closed_by: Mapped[User | None] = relationship(foreign_keys=[closed_by_user_id])
    last_edited_by: Mapped[User | None] = relationship(foreign_keys=[last_edited_by_user_id])
    cash_drawers: Mapped[list[CashClosureDrawer]] = relationship(
        back_populates="closure",
        cascade="all, delete-orphan",
        order_by="CashClosureDrawer.sort_order",
    )
    card_terminals: Mapped[list[CashClosureCardTerminal]] = relationship(
        back_populates="closure",
        cascade="all, delete-orphan",
        order_by="CashClosureCardTerminal.sort_order",
    )


class CashClosureDrawer(TimestampMixin, Base):
    __tablename__ = "cash_closure_drawers"
    __table_args__ = (
        Index("ix_cash_closure_drawers_closure", "closure_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    closure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cash_closures.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    theoretical_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    real_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    closure: Mapped[CashClosure] = relationship(back_populates="cash_drawers")


class CashClosureCardTerminal(TimestampMixin, Base):
    __tablename__ = "cash_closure_card_terminals"
    __table_args__ = (
        Index("ix_cash_closure_card_terminals_closure", "closure_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    closure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cash_closures.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    theoretical_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    real_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    closure: Mapped[CashClosure] = relationship(back_populates="card_terminals")
