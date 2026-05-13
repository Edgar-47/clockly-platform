from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.company_location import CompanyLocation
from app.schemas.location import LocationCreate, LocationListResponse, LocationRead, LocationUpdate
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
        latitude=payload.latitude,
        longitude=payload.longitude,
        allowed_radius_meters=payload.allowed_radius_meters,
        is_active=payload.is_active,
    )
    db.add(location)
    db.commit()
    return location


@router.patch("/{location_id}", response_model=LocationRead)
def update_location(
    location_id: UUID,
    payload: LocationUpdate,
    ctx: TenantContext = Depends(require_permission("locations:write")),
    db: Session = Depends(get_db),
) -> LocationRead:
    location = db.scalar(
        select(CompanyLocation).where(
            CompanyLocation.id == location_id,
            CompanyLocation.company_id == ctx.company_id,
        )
    )
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    if payload.name is not None:
        location.name = payload.name
    if payload.address is not None:
        location.address = payload.address
    if payload.timezone is not None:
        location.timezone = payload.timezone
    if payload.latitude is not None:
        location.latitude = payload.latitude
    if payload.longitude is not None:
        location.longitude = payload.longitude
    if payload.allowed_radius_meters is not None:
        location.allowed_radius_meters = payload.allowed_radius_meters
    if payload.is_active is not None:
        location.is_active = payload.is_active
    db.add(location)
    db.commit()
    db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: UUID,
    ctx: TenantContext = Depends(require_permission("locations:write")),
    db: Session = Depends(get_db),
) -> None:
    location = db.scalar(
        select(CompanyLocation).where(
            CompanyLocation.id == location_id,
            CompanyLocation.company_id == ctx.company_id,
        )
    )
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found.")
    # Soft-delete: mark inactive to preserve historical attendance data
    location.is_active = False
    db.add(location)
    db.commit()
