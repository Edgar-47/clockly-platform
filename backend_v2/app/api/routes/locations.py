from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.company_location import CompanyLocation
from app.schemas.location import LocationCreate, LocationListResponse, LocationRead
from app.services.plans import check_plan_feature


router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=LocationListResponse)
def list_locations(
    include_inactive: bool = Query(default=False),
    ctx: TenantContext = Depends(require_permission("locations:read")),
    db: Session = Depends(get_db),
) -> LocationListResponse:
    statement = select(CompanyLocation).where(CompanyLocation.company_id == ctx.company_id)
    if not include_inactive:
        statement = statement.where(CompanyLocation.is_active.is_(True))
    statement = statement.order_by(CompanyLocation.name)
    return LocationListResponse(items=list(db.scalars(statement)))


@router.post("", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: LocationCreate,
    ctx: TenantContext = Depends(require_permission("locations:write")),
    db: Session = Depends(get_db),
) -> LocationRead:
    check_plan_feature(db, ctx.company_id, "has_multi_location", actor_user_id=ctx.user.id)
    location = CompanyLocation(
        company_id=ctx.company_id,
        name=payload.name,
        address=payload.address,
        timezone=payload.timezone,
        is_active=payload.is_active,
    )
    db.add(location)
    db.commit()
    return location
