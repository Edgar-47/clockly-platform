from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeOwnPinChange,
    EmployeePinReset,
    EmployeeRead,
    EmployeeUpdate,
)
from app.services.employee_service import EmployeeService


router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    include_inactive: bool = Query(default=False),
    limit: int | None = Query(default=None, ge=1, le=500, description="Max items to return. Omit for all."),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("employees:read")),
    db: Session = Depends(get_db),
) -> EmployeeListResponse:
    items, total = EmployeeService(db, company_id=ctx.company_id).list_employees(
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return EmployeeListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(
    employee_id: UUID,
    ctx: TenantContext = Depends(require_permission("employees:read")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    employee = EmployeeRepository(db, company_id=ctx.company_id).get(employee_id)
    if employee is None:
        raise NotFoundError("Employee not found.")
    return employee


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).create_employee(payload, actor_user_id=ctx.user.id)


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: UUID,
    payload: EmployeeUpdate,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).update_employee(employee_id, payload, actor_user_id=ctx.user.id)


@router.post("/me/pin", response_model=EmployeeRead)
def change_own_pin(
    payload: EmployeeOwnPinChange,
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).change_own_pin(
        ctx.user,
        current_pin=payload.current_pin,
        new_pin=payload.new_pin,
    )


@router.post("/{employee_id}/pin", response_model=EmployeeRead)
def reset_employee_pin(
    employee_id: UUID,
    payload: EmployeePinReset,
    ctx: TenantContext = Depends(require_permission("employees:write")),
    db: Session = Depends(get_db),
) -> EmployeeRead:
    return EmployeeService(db, company_id=ctx.company_id).reset_pin(
        employee_id,
        payload.pin,
        actor_user_id=ctx.user.id,
    )
