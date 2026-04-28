from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.timezones import to_tenant_timezone
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.company_settings import AutoClockOutSettingsRead, AutoClockOutSettingsUpdate
from app.services.company_settings_service import CompanySettingsService


router = APIRouter(prefix="/settings", tags=["settings"])


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


def _settings_read(settings, timezone: str) -> AutoClockOutSettingsRead:
    payload = AutoClockOutSettingsRead.model_validate(settings)
    payload.auto_clock_out_updated_at = to_tenant_timezone(payload.auto_clock_out_updated_at, timezone)
    payload.updated_at = to_tenant_timezone(payload.updated_at, timezone)
    return payload
