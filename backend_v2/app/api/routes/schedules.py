from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.schemas.schedule import ScheduleCreate, ScheduleListResponse, ScheduleRead, ScheduleUpdate
from app.services.schedule_service import ScheduleService


router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("", response_model=ScheduleListResponse)
def list_schedules(
    include_inactive: bool = Query(default=False),
    ctx: TenantContext = Depends(require_permission("schedules:read")),
    db: Session = Depends(get_db),
) -> ScheduleListResponse:
    items, total = ScheduleService(db, company_id=ctx.company_id).list_schedules(
        include_inactive=include_inactive,
    )
    return ScheduleListResponse(items=items, total=total)


@router.post("", response_model=ScheduleRead, status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: ScheduleCreate,
    ctx: TenantContext = Depends(require_permission("schedules:write")),
    db: Session = Depends(get_db),
) -> ScheduleRead:
    return ScheduleService(db, company_id=ctx.company_id).create_schedule(payload)


@router.get("/{schedule_id}", response_model=ScheduleRead)
def get_schedule(
    schedule_id: UUID,
    ctx: TenantContext = Depends(require_permission("schedules:read")),
    db: Session = Depends(get_db),
) -> ScheduleRead:
    return ScheduleService(db, company_id=ctx.company_id).get_schedule(schedule_id)


@router.patch("/{schedule_id}", response_model=ScheduleRead)
def update_schedule(
    schedule_id: UUID,
    payload: ScheduleUpdate,
    ctx: TenantContext = Depends(require_permission("schedules:write")),
    db: Session = Depends(get_db),
) -> ScheduleRead:
    return ScheduleService(db, company_id=ctx.company_id).update_schedule(schedule_id, payload)
