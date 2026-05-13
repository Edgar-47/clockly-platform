from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company


def _generate_code() -> str:
    return secrets.token_urlsafe(8).upper()[:10]


class Affiliate(TimestampMixin, Base):
    """Partner (gestoría / asesoría) que refiere nuevas empresas a ClockLy.

    commission_rate: porcentaje decimal (e.g. 0.20 = 20%) de la cuota mensual.
    """

    __tablename__ = "affiliates"
    __table_args__ = (
        UniqueConstraint("code", name="uq_affiliates_code"),
        Index("ix_affiliates_is_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Owning company (the gestoría that's an affiliate)
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    partner_name: Mapped[str] = mapped_column(String(160), nullable=False)
    partner_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Unique referral code — shared publicly (e.g. clockly.com/partner?ref=XYZ)
    code: Mapped[str] = mapped_column(String(20), nullable=False, default=_generate_code)

    commission_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0.20"))
    total_earned: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(String(500))

    company: Mapped[Company | None] = relationship(foreign_keys=[company_id])
    referrals: Mapped[list[AffiliateReferral]] = relationship(back_populates="affiliate", cascade="all, delete-orphan")


class AffiliateReferral(TimestampMixin, Base):
    """Tracks a company registered via an affiliate's referral code."""

    __tablename__ = "affiliate_referrals"
    __table_args__ = (
        UniqueConstraint("referred_company_id", name="uq_referrals_company"),
        Index("ix_referrals_affiliate_status", "affiliate_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    affiliate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("affiliates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    referred_company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Trial | Active subscription | Churned
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="trial")
    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    churned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    affiliate: Mapped[Affiliate] = relationship(back_populates="referrals")
    referred_company: Mapped[Company] = relationship(foreign_keys=[referred_company_id])
