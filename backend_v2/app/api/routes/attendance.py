from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import client_ip, kiosk_limiter
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.enums import AttendanceMethod, AttendanceStatus, UserRole
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.attendance import (
    AttendanceSessionListResponse,
    AttendanceSessionRead,
    ClockInRequest,
    ClockOutRequest,
)
from app.services.attendance_service import AttendanceService
from app.services.plans import check_plan_feature


router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("/sessions", response_model=AttendanceSessionListResponse)
def list_sessions(
    employee_id: UUID | None = Query(default=None),
    session_status: AttendanceStatus | None = Query(default=None, alias="status"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("attendance:read")),
    db: Session = Depends(get_db),
) -> AttendanceSessionListResponse:
    if employee_id is not None or date_from is not None or date_to is not None:
        check_plan_feature(db, ctx.company_id, "has_advanced_filters", actor_user_id=ctx.user.id)

    # Employees can only view their own sessions — ignore any employee_id in the request.
    if ctx.user.role == UserRole.EMPLOYEE:
        own = EmployeeRepository(db, company_id=ctx.company_id).get_by_user_id(ctx.user.id)
        employee_id = own.id if own else None
        if own is None:
            return AttendanceSessionListResponse(items=[], total=0, limit=limit, offset=offset)

    sessions, total = AttendanceService(db, company_id=ctx.company_id).list_sessions(
        employee_id=employee_id,
        status=session_status,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return AttendanceSessionListResponse(items=sessions, total=total, limit=limit, offset=offset)


@router.post("/clock-in", response_model=AttendanceSessionRead, status_code=status.HTTP_201_CREATED)
def clock_in(
    request: Request,
    payload: ClockInRequest | None = None,
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> AttendanceSessionRead:
    payload = payload or ClockInRequest()
    if payload.method in {AttendanceMethod.KIOSK, AttendanceMethod.PIN} or payload.pin:
        kiosk_limiter.check(client_ip(request))
    # Employees can only clock in themselves.
    if ctx.user.role == UserRole.EMPLOYEE:
        payload = ClockInRequest(
            method=payload.method,
            notes=payload.notes,
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy_meters=payload.accuracy_meters,
            location_source=payload.location_source,
            location_permission_status=payload.location_permission_status,
        )
    return AttendanceService(db, company_id=ctx.company_id).clock_in(
        actor=ctx.user,
        employee_id=payload.employee_id,
        method=payload.method,
        pin=payload.pin,
        notes=payload.notes,
        geo=payload.geo(),
    )


@router.post("/clock-out", response_model=AttendanceSessionRead)
def clock_out(
    request: Request,
    payload: ClockOutRequest | None = None,
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> AttendanceSessionRead:
    payload = payload or ClockOutRequest()
    if payload.method in {AttendanceMethod.KIOSK, AttendanceMethod.PIN} or payload.pin:
        kiosk_limiter.check(client_ip(request))
    # Employees can only clock out themselves.
    if ctx.user.role == UserRole.EMPLOYEE:
        payload = ClockOutRequest(
            method=payload.method,
            notes=payload.notes,
            latitude=payload.latitude,
            longitude=payload.longitude,
            accuracy_meters=payload.accuracy_meters,
            location_source=payload.location_source,
            location_permission_status=payload.location_permission_status,
        )
    return AttendanceService(db, company_id=ctx.company_id).clock_out(
        actor=ctx.user,
        employee_id=payload.employee_id,
        session_id=payload.session_id,
        method=payload.method,
        pin=payload.pin,
        notes=payload.notes,
        geo=payload.geo(),
    )
