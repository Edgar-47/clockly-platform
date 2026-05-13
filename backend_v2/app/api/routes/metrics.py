from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.metrics import MetricsOverview
from app.services.metrics_service import MetricsService
from app.services.plans import check_plan_feature, company_feature_enabled


router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/overview", response_model=MetricsOverview)
def overview(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("metrics:read")),
    db: Session = Depends(get_db),
) -> MetricsOverview:
    if date_from is not None or date_to is not None:
        check_plan_feature(db, ctx.company_id, "has_advanced_filters", actor_user_id=ctx.user.id)

    return MetricsService(db, company_id=ctx.company_id).overview(
        date_from=date_from,
        date_to=date_to,
        include_admin_reports=company_feature_enabled(ctx.company, "has_admin_reports"),
    )
