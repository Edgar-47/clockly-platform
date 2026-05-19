from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.employee import Employee
from app.schemas.schedule import (
    EmployeeScheduleAssign,
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleRead,
    ScheduleUpdate,
)
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


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: UUID,
    ctx: TenantContext = Depends(require_permission("schedules:write")),
    db: Session = Depends(get_db),
) -> None:
    ScheduleService(db, company_id=ctx.company_id).delete_schedule(schedule_id)


# ── Employee schedule assignment ──────────────────────────────────────────────

@router.get("/employees/{employee_id}/schedule", response_model=ScheduleRead | None)
def get_employee_schedule(
    employee_id: UUID,
    ctx: TenantContext = Depends(require_permission("schedules:read")),
    db: Session = Depends(get_db),
) -> ScheduleRead | None:
    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.company_id == ctx.company_id,
        )
    )
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found.")
    if employee.schedule_id is None:
        return None
    return ScheduleService(db, company_id=ctx.company_id).get_schedule(employee.schedule_id)


@router.put("/employees/{employee_id}/schedule", response_model=ScheduleRead | None)
def assign_employee_schedule(
    employee_id: UUID,
    payload: EmployeeScheduleAssign,
    ctx: TenantContext = Depends(require_permission("schedules:write")),
    db: Session = Depends(get_db),
) -> ScheduleRead | None:
    employee = db.scalar(
        select(Employee).where(
            Employee.id == employee_id,
            Employee.company_id == ctx.company_id,
        )
    )
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if payload.schedule_id is not None:
        svc = ScheduleService(db, company_id=ctx.company_id)
        schedule = svc.get_schedule(payload.schedule_id)  # raises 404 if not found
        employee.schedule_id = payload.schedule_id
        db.add(employee)
        db.commit()
        return schedule

    # Unassign
    employee.schedule_id = None
    db.add(employee)
    db.commit()
    return None
