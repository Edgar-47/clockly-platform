from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import client_ip, kiosk_limiter
from app.core.timezones import to_tenant_timezone
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.enums import AttendanceMethod, AttendanceStatus, UserRole
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.attendance import (
    AttendanceSessionAdminUpdate,
    AttendanceSessionListResponse,
    AttendanceSessionRead,
    AutoCloseOpenSessionsRequest,
    AutoCloseOpenSessionsResponse,
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
    return AttendanceSessionListResponse(
        items=[_session_read(session, ctx.company.timezone) for session in sessions],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/clock-in", response_model=AttendanceSessionRead, status_code=status.HTTP_201_CREATED)
def clock_in(
    request: Request,
    payload: ClockInRequest | None = None,
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> AttendanceSessionRead:
    payload = payload or ClockInRequest()
    if payload.method in {AttendanceMethod.KIOSK, AttendanceMethod.PIN} or payload.pin:
        kiosk_limiter.check(_kiosk_key(request, payload.employee_id))
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
            auto_close_open_session=payload.auto_close_open_session,
        )
    session = AttendanceService(db, company_id=ctx.company_id).clock_in(
        actor=ctx.user,
        employee_id=payload.employee_id,
        method=payload.method,
        pin=payload.pin,
        notes=payload.notes,
        geo=payload.geo(),
        auto_close_open_session=payload.auto_close_open_session,
    )
    return _session_read(session, ctx.company.timezone)


@router.post("/clock-out", response_model=AttendanceSessionRead)
def clock_out(
    request: Request,
    payload: ClockOutRequest | None = None,
    ctx: TenantContext = Depends(require_permission("attendance:write")),
    db: Session = Depends(get_db),
) -> AttendanceSessionRead:
    payload = payload or ClockOutRequest()
    if payload.method in {AttendanceMethod.KIOSK, AttendanceMethod.PIN} or payload.pin:
        kiosk_limiter.check(_kiosk_key(request, payload.employee_id or payload.session_id))
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
    session = AttendanceService(db, company_id=ctx.company_id).clock_out(
        actor=ctx.user,
        employee_id=payload.employee_id,
        session_id=payload.session_id,
        method=payload.method,
        pin=payload.pin,
        notes=payload.notes,
        geo=payload.geo(),
    )
    return _session_read(session, ctx.company.timezone)


@router.patch("/sessions/{session_id}", response_model=AttendanceSessionRead)
def update_session(
    session_id: UUID,
    payload: AttendanceSessionAdminUpdate,
    ctx: TenantContext = Depends(require_permission("attendance:manage")),
    db: Session = Depends(get_db),
) -> AttendanceSessionRead:
    session = AttendanceService(db, company_id=ctx.company_id).update_session(
        session_id=session_id,
        payload=payload,
        actor=ctx.user,
    )
    return _session_read(session, ctx.company.timezone)


@router.post("/sessions/bulk/auto-close", response_model=AutoCloseOpenSessionsResponse)
def auto_close_open_sessions(
    payload: AutoCloseOpenSessionsRequest | None = None,
    ctx: TenantContext = Depends(require_permission("attendance:manage")),
    db: Session = Depends(get_db),
) -> AutoCloseOpenSessionsResponse:
    payload = payload or AutoCloseOpenSessionsRequest()
    sessions = AttendanceService(db, company_id=ctx.company_id).auto_close_open_sessions(
        payload=payload,
        actor=ctx.user,
    )
    return AutoCloseOpenSessionsResponse(
        closed_count=len(sessions),
        items=[_session_read(session, ctx.company.timezone) for session in sessions],
    )


def _session_read(session, timezone: str) -> AttendanceSessionRead:
    payload = AttendanceSessionRead.model_validate(session)
    payload.clock_in = to_tenant_timezone(payload.clock_in, timezone)
    payload.clock_out = to_tenant_timezone(payload.clock_out, timezone)
    payload.created_at = to_tenant_timezone(payload.created_at, timezone)
    payload.updated_at = to_tenant_timezone(payload.updated_at, timezone)
    payload.corrected_at = to_tenant_timezone(payload.corrected_at, timezone)
    payload.company_timezone = timezone
    return payload


def _kiosk_key(request: Request, employee_or_session_id: UUID | None) -> str:
    suffix = str(employee_or_session_id) if employee_or_session_id else "unknown"
    return f"{client_ip(request)}:{suffix}"
