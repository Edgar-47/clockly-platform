from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.analytics import AnomaliesResponse, PunctualityRanking, TrendsResponse
from app.services.analytics_service import AnalyticsService
from app.services.plans import check_plan_feature

router = APIRouter(prefix="/analytics", tags=["analytics"])

_VALID_PERIODS = {"7d", "30d", "90d", "12m"}


@router.get("/trends", response_model=TrendsResponse)
def get_trends(
    period: str = Query(default="30d"),
    ctx: TenantContext = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> TrendsResponse:
    check_plan_feature(db, ctx.company_id, "has_admin_reports", actor_user_id=ctx.user.id)
    if period not in _VALID_PERIODS:
        period = "30d"
    return AnalyticsService(db, company_id=ctx.company_id).trends(period)


@router.get("/punctuality", response_model=PunctualityRanking)
def get_punctuality(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> PunctualityRanking:
    check_plan_feature(db, ctx.company_id, "has_admin_reports", actor_user_id=ctx.user.id)
    return AnalyticsService(db, company_id=ctx.company_id).punctuality_ranking(
        date_from=date_from, date_to=date_to
    )


@router.get("/anomalies", response_model=AnomaliesResponse)
def get_anomalies(
    days: int = Query(default=30, ge=7, le=90),
    ctx: TenantContext = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> AnomaliesResponse:
    check_plan_feature(db, ctx.company_id, "has_admin_reports", actor_user_id=ctx.user.id)
    return AnalyticsService(db, company_id=ctx.company_id).anomalies(days=days)
