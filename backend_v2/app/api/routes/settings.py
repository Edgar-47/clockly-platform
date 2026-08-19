from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.timezones import to_tenant_timezone
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.company_settings import AutoClockOutSettingsRead, AutoClockOutSettingsUpdate
from app.services.company_settings_service import CompanySettingsService


router = APIRouter(prefix="/settings", tags=["settings"])


class CompanyProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    cif: str | None = Field(default=None, max_length=20)
    sector: str | None = Field(default=None, max_length=100)
    company_size: str | None = Field(default=None, max_length=40)
    country: str | None = Field(default=None, max_length=80)

    @field_validator("name", mode="before")
    @classmethod
    def strip_required_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("cif", "sector", "company_size", "country", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class CompanyProfileRead(BaseModel):
    id: str
    name: str
    cif: str | None
    sector: str | None
    company_size: str | None
    country: str | None
    timezone: str


@router.get("/auto-clock-out", response_model=AutoClockOutSettingsRead)
def get_auto_clock_out_settings(
    ctx: TenantContext = Depends(require_permission("settings:read")),
    db: Session = Depends(get_db),
) -> AutoClockOutSettingsRead:
    settings = CompanySettingsService(db, company_id=ctx.company_id).get_auto_clock_out_settings()
    return _settings_read(settings, ctx.company.timezone)


@router.put("/auto-clock-out", response_model=AutoClockOutSettingsRead)
def update_auto_clock_out_settings(
    payload: AutoClockOutSettingsUpdate,
    ctx: TenantContext = Depends(require_permission("settings:write")),
    db: Session = Depends(get_db),
) -> AutoClockOutSettingsRead:
    if payload.auto_clock_out_timezone is None:
        payload.auto_clock_out_timezone = ctx.company.timezone
    settings = CompanySettingsService(db, company_id=ctx.company_id).update_auto_clock_out_settings(
        payload,
        actor=ctx.user,
    )
    return _settings_read(settings, ctx.company.timezone)


@router.get("/company", response_model=CompanyProfileRead)
def get_company_profile(
    ctx: TenantContext = Depends(require_permission("settings:read")),
) -> CompanyProfileRead:
    c = ctx.company
    return CompanyProfileRead(
        id=str(c.id),
        name=c.name,
        cif=getattr(c, "cif", None),
        sector=getattr(c, "sector", None),
        company_size=getattr(c, "company_size", None),
        country=c.country,
        timezone=c.timezone,
    )


@router.patch("/company", response_model=CompanyProfileRead)
def update_company_profile(
    payload: CompanyProfileUpdate,
    ctx: TenantContext = Depends(require_permission("settings:write")),
    db: Session = Depends(get_db),
) -> CompanyProfileRead:
    company = ctx.company
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(company, key, value)
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyProfileRead(
        id=str(company.id),
        name=company.name,
        cif=getattr(company, "cif", None),
        sector=getattr(company, "sector", None),
        company_size=getattr(company, "company_size", None),
        country=company.country,
        timezone=company.timezone,
    )


def _settings_read(settings, timezone: str) -> AutoClockOutSettingsRead:
    payload = AutoClockOutSettingsRead.model_validate(settings)
    payload.auto_clock_out_updated_at = to_tenant_timezone(payload.auto_clock_out_updated_at, timezone)
    payload.updated_at = to_tenant_timezone(payload.updated_at, timezone)
    return payload
