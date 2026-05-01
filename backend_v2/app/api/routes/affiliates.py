from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import ConflictError, NotFoundError
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_superadmin
from app.models.affiliate import Affiliate, AffiliateReferral

router = APIRouter(prefix="/affiliates", tags=["affiliates"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AffiliateCreate(BaseModel):
    partner_name: str = Field(min_length=2, max_length=160)
    partner_email: EmailStr
    commission_rate: Decimal = Field(default=Decimal("0.20"), ge=Decimal("0.01"), le=Decimal("0.50"))
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("partner_name", "notes", mode="before")
    @classmethod
    def strip_strings(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip() or None
        return v


class AffiliateRead(BaseModel):
    id: UUID
    partner_name: str
    partner_email: str
    code: str
    commission_rate: Decimal
    total_earned: Decimal
    is_active: bool
    notes: str | None
    referral_count: int
    active_referrals: int
    converted_referrals: int


class AffiliateReferralRead(BaseModel):
    id: UUID
    referred_company_id: UUID
    referred_company_name: str
    status: str
    created_at: str
    converted_at: str | None


class AffiliateStatusUpdate(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# Superadmin endpoints — manage affiliates
# ---------------------------------------------------------------------------


@router.get("", response_model=list[AffiliateRead])
def list_affiliates(
    active_only: bool = Query(default=False),
    ctx: TenantContext = Depends(require_superadmin()),
    db: Session = Depends(get_db),
) -> list[AffiliateRead]:
    stmt = select(Affiliate).options(joinedload(Affiliate.referrals))
    if active_only:
        stmt = stmt.where(Affiliate.is_active.is_(True))
    affiliates = list(db.scalars(stmt))
    return [_affiliate_read(a) for a in affiliates]


@router.post("", response_model=AffiliateRead)
def create_affiliate(
    payload: AffiliateCreate,
    ctx: TenantContext = Depends(require_superadmin()),
    db: Session = Depends(get_db),
) -> AffiliateRead:
    existing = db.scalar(
        select(Affiliate).where(Affiliate.partner_email == str(payload.partner_email))
    )
    if existing:
        raise ConflictError("Ya existe un afiliado con ese email.")
    affiliate = Affiliate(
        partner_name=payload.partner_name,
        partner_email=str(payload.partner_email),
        commission_rate=payload.commission_rate,
        notes=payload.notes,
    )
    db.add(affiliate)
    db.commit()
    db.refresh(affiliate)
    return _affiliate_read(affiliate)


@router.patch("/{affiliate_id}/status", response_model=AffiliateRead)
def update_affiliate_status(
    affiliate_id: UUID,
    payload: AffiliateStatusUpdate,
    ctx: TenantContext = Depends(require_superadmin()),
    db: Session = Depends(get_db),
) -> AffiliateRead:
    affiliate = _get_affiliate(db, affiliate_id)
    affiliate.is_active = payload.is_active
    db.add(affiliate)
    db.commit()
    db.refresh(affiliate)
    return _affiliate_read(affiliate)


@router.get("/{affiliate_id}/referrals", response_model=list[AffiliateReferralRead])
def list_referrals(
    affiliate_id: UUID,
    ctx: TenantContext = Depends(require_superadmin()),
    db: Session = Depends(get_db),
) -> list[AffiliateReferralRead]:
    _get_affiliate(db, affiliate_id)
    referrals = list(
        db.scalars(
            select(AffiliateReferral)
            .options(joinedload(AffiliateReferral.referred_company))
            .where(AffiliateReferral.affiliate_id == affiliate_id)
            .order_by(AffiliateReferral.created_at.desc())
        )
    )
    return [_referral_read(r) for r in referrals]


# ---------------------------------------------------------------------------
# Public endpoint — validate referral code (used during registration)
# ---------------------------------------------------------------------------


class ReferralCodeCheck(BaseModel):
    code: str
    valid: bool
    partner_name: str | None


@router.get("/check-code", response_model=ReferralCodeCheck)
def check_referral_code(
    code: str = Query(min_length=1, max_length=20),
    db: Session = Depends(get_db),
) -> ReferralCodeCheck:
    affiliate = db.scalar(
        select(Affiliate).where(Affiliate.code == code.upper(), Affiliate.is_active.is_(True))
    )
    return ReferralCodeCheck(
        code=code.upper(),
        valid=affiliate is not None,
        partner_name=affiliate.partner_name if affiliate else None,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_affiliate(db: Session, affiliate_id: UUID) -> Affiliate:
    affiliate = db.scalar(
        select(Affiliate).options(joinedload(Affiliate.referrals)).where(Affiliate.id == affiliate_id)
    )
    if affiliate is None:
        raise NotFoundError("Afiliado no encontrado.")
    return affiliate


def _affiliate_read(affiliate: Affiliate) -> AffiliateRead:
    referrals = affiliate.referrals or []
    return AffiliateRead(
        id=affiliate.id,
        partner_name=affiliate.partner_name,
        partner_email=affiliate.partner_email,
        code=affiliate.code,
        commission_rate=affiliate.commission_rate,
        total_earned=affiliate.total_earned,
        is_active=affiliate.is_active,
        notes=affiliate.notes,
        referral_count=len(referrals),
        active_referrals=sum(1 for r in referrals if r.status == "active"),
        converted_referrals=sum(1 for r in referrals if r.status in {"active", "converted"}),
    )


def _referral_read(referral: AffiliateReferral) -> AffiliateReferralRead:
    return AffiliateReferralRead(
        id=referral.id,
        referred_company_id=referral.referred_company_id,
        referred_company_name=referral.referred_company.name if referral.referred_company else str(referral.referred_company_id),
        status=referral.status,
        created_at=referral.created_at.isoformat() if referral.created_at else "",
        converted_at=referral.converted_at.isoformat() if referral.converted_at else None,
    )
