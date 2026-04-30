from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.rate_limit import client_ip
from app.db.session import get_db
from app.dependencies.auth import TenantContext, get_current_context, require_permission
from app.schemas.gdpr import GeoConsentCreate, GeoConsentListResponse, GeoConsentRead
from app.services.gdpr_service import GDPRService


router = APIRouter(prefix="/gdpr", tags=["gdpr"])


@router.get("/me/export")
def export_my_data(
    ctx: TenantContext = Depends(get_current_context),
    db: Session = Depends(get_db),
) -> dict:
    return GDPRService(db, company_id=ctx.company_id).export_for_current_user(actor=ctx.user)


@router.get("/users/{user_id}/export")
def export_user_data(
    user_id: UUID,
    ctx: TenantContext = Depends(require_permission("gdpr:export")),
    db: Session = Depends(get_db),
) -> dict:
    return GDPRService(db, company_id=ctx.company_id).export_user(user_id, actor=ctx.user)


@router.get("/employees/{employee_id}/export")
def export_employee_data(
    employee_id: UUID,
    ctx: TenantContext = Depends(require_permission("gdpr:export")),
    db: Session = Depends(get_db),
) -> dict:
    return GDPRService(db, company_id=ctx.company_id).export_employee(employee_id, actor=ctx.user)


@router.post("/geolocation-consents", response_model=GeoConsentRead)
def record_geolocation_consent(
    payload: GeoConsentCreate,
    request: Request,
    ctx: TenantContext = Depends(get_current_context),
    db: Session = Depends(get_db),
) -> GeoConsentRead:
    return GDPRService(db, company_id=ctx.company_id).record_geo_consent(
        payload,
        actor=ctx.user,
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )


@router.get("/geolocation-consents/me", response_model=GeoConsentListResponse)
def list_my_geolocation_consents(
    ctx: TenantContext = Depends(get_current_context),
    db: Session = Depends(get_db),
) -> GeoConsentListResponse:
    items = GDPRService(db, company_id=ctx.company_id).list_geo_consents_for_user(ctx.user.id, actor=ctx.user)
    return GeoConsentListResponse(items=items, total=len(items))


@router.get("/users/{user_id}/geolocation-consents", response_model=GeoConsentListResponse)
def list_user_geolocation_consents(
    user_id: UUID,
    ctx: TenantContext = Depends(require_permission("gdpr:export")),
    db: Session = Depends(get_db),
) -> GeoConsentListResponse:
    items = GDPRService(db, company_id=ctx.company_id).list_geo_consents_for_user(user_id, actor=ctx.user)
    return GeoConsentListResponse(items=items, total=len(items))
