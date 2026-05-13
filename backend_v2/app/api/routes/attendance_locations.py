"""Attendance location map endpoints.

These endpoints power the admin "Localizaciones" map view. They surface
attendance session data alongside geolocation fields without creating a
separate event table — the coordinates live on attendance_sessions.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.timezones import to_tenant_timezone
from app.db.session import get_db
from app.dependencies.auth import TenantContext, require_permission
from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.enums import AttendanceMethod, AttendanceStatus, LocationPermissionStatus, LocationSource, LocationStatus
from app.services.plans import check_plan_feature


router = APIRouter(prefix="/attendance-locations", tags=["attendance-locations"])


# ── Response schemas ──────────────────────────────────────────────────────────

class EmployeeSnippet(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    full_name: str


class AttendanceLocationEvent(BaseModel):
    """Flattened clock-in or clock-out event with coordinates."""

    session_id: UUID
    company_id: UUID
    employee_id: UUID
    employee: EmployeeSnippet | None
    event_type: str  # "clock_in" | "clock_out"
    occurred_at: datetime
    latitude: float | None
    longitude: float | None
    accuracy_meters: float | None
    location_status: LocationStatus | None
    distance_meters: float | None
    location_source: LocationSource
    location_permission_status: LocationPermissionStatus
    method: AttendanceMethod
    session_status: AttendanceStatus


class AttendanceLocationListResponse(BaseModel):
    items: list[AttendanceLocationEvent]
    total: int
    limit: int
    offset: int


class LatestLocationItem(BaseModel):
    employee_id: UUID
    employee: EmployeeSnippet | None
    session_id: UUID
    occurred_at: datetime
    latitude: float | None
    longitude: float | None
    location_status: LocationStatus | None
    session_status: AttendanceStatus


class LocationSummary(BaseModel):
    total: int
    in_range: int
    out_of_range: int
    unknown: int
    employees_with_incidents: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _employee_snippet(session: AttendanceSession) -> EmployeeSnippet | None:
    emp: Employee | None = session.employee
    if emp is None:
        return None
    return EmployeeSnippet(
        id=emp.id,
        first_name=emp.first_name,
        last_name=emp.last_name,
        full_name=emp.full_name,
    )


def _base_query(db: Session, company_id: UUID):
    return (
        select(AttendanceSession)
        .where(AttendanceSession.company_id == company_id)
        .options()
    )


def _apply_filters(
    stmt,
    *,
    employee_id: UUID | None,
    date_from: datetime | None,
    date_to: datetime | None,
    location_status: LocationStatus | None,
    work_location_id: UUID | None,
):
    if employee_id:
        stmt = stmt.where(AttendanceSession.employee_id == employee_id)
    if date_from:
        stmt = stmt.where(AttendanceSession.clock_in >= date_from)
    if date_to:
        stmt = stmt.where(AttendanceSession.clock_in <= date_to)
    if location_status:
        stmt = stmt.where(
            (AttendanceSession.clock_in_location_status == location_status)
            | (AttendanceSession.clock_out_location_status == location_status)
        )
    # work_location_id filtering is a future enhancement (requires linking sessions to locations)
    return stmt


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=AttendanceLocationListResponse)
def list_location_events(
    employee_id: UUID | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    location_status: LocationStatus | None = Query(default=None),
    work_location_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    ctx: TenantContext = Depends(require_permission("locations:read")),
    db: Session = Depends(get_db),
) -> AttendanceLocationListResponse:
    check_plan_feature(db, ctx.company_id, "has_geolocation", actor_user_id=ctx.user.id)
    base = _apply_filters(
        _base_query(db, ctx.company_id),
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
        location_status=location_status,
        work_location_id=work_location_id,
    )

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    sessions = db.scalars(base.order_by(AttendanceSession.clock_in.desc()).limit(limit).offset(offset)).all()

    events: list[AttendanceLocationEvent] = []
    for s in sessions:
        emp = _employee_snippet(s)
        # Emit a clock-in event
        events.append(
            AttendanceLocationEvent(
                session_id=s.id,
                company_id=s.company_id,
                employee_id=s.employee_id,
                employee=emp,
                event_type="clock_in",
                occurred_at=to_tenant_timezone(s.clock_in, ctx.company.timezone),
                latitude=s.clock_in_latitude,
                longitude=s.clock_in_longitude,
                accuracy_meters=s.clock_in_accuracy_meters,
                location_status=s.clock_in_location_status,
                distance_meters=s.clock_in_distance_meters,
                location_source=s.location_source,
                location_permission_status=s.location_permission_status,
                method=s.method,
                session_status=s.status,
            )
        )
        # Emit a clock-out event if the session is closed
        if s.clock_out is not None:
            events.append(
                AttendanceLocationEvent(
                    session_id=s.id,
                    company_id=s.company_id,
                    employee_id=s.employee_id,
                    employee=emp,
                    event_type="clock_out",
                    occurred_at=to_tenant_timezone(s.clock_out, ctx.company.timezone),
                    latitude=s.clock_out_latitude,
                    longitude=s.clock_out_longitude,
                    accuracy_meters=s.clock_out_accuracy_meters,
                    location_status=s.clock_out_location_status,
                    distance_meters=s.clock_out_distance_meters,
                    location_source=s.location_source,
                    location_permission_status=s.location_permission_status,
                    method=s.method,
                    session_status=s.status,
                )
            )

    return AttendanceLocationListResponse(items=events, total=total, limit=limit, offset=offset)


@router.get("/latest", response_model=list[LatestLocationItem])
def latest_locations(
    ctx: TenantContext = Depends(require_permission("locations:read")),
    db: Session = Depends(get_db),
) -> list[LatestLocationItem]:
    """Return the most recent attended session per employee (open preferred)."""
    check_plan_feature(db, ctx.company_id, "has_geolocation", actor_user_id=ctx.user.id)
    # Subquery: max clock_in per employee
    sub = (
        select(
            AttendanceSession.employee_id,
            func.max(AttendanceSession.clock_in).label("max_clock_in"),
        )
        .where(AttendanceSession.company_id == ctx.company_id)
        .group_by(AttendanceSession.employee_id)
        .subquery()
    )
    sessions = db.scalars(
        select(AttendanceSession)
        .join(sub, (AttendanceSession.employee_id == sub.c.employee_id) & (AttendanceSession.clock_in == sub.c.max_clock_in))
        .where(AttendanceSession.company_id == ctx.company_id)
        .order_by(AttendanceSession.clock_in.desc())
    ).all()

    return [
        LatestLocationItem(
            employee_id=s.employee_id,
            employee=_employee_snippet(s),
            session_id=s.id,
            occurred_at=to_tenant_timezone(s.clock_in, ctx.company.timezone),
            latitude=s.clock_in_latitude,
            longitude=s.clock_in_longitude,
            location_status=s.clock_in_location_status,
            session_status=s.status,
        )
        for s in sessions
    ]


@router.get("/summary", response_model=LocationSummary)
def location_summary(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    employee_id: UUID | None = Query(default=None),
    ctx: TenantContext = Depends(require_permission("locations:read")),
    db: Session = Depends(get_db),
) -> LocationSummary:
    check_plan_feature(db, ctx.company_id, "has_geolocation", actor_user_id=ctx.user.id)
    base = select(AttendanceSession).where(AttendanceSession.company_id == ctx.company_id)
    if date_from:
        base = base.where(AttendanceSession.clock_in >= date_from)
    if date_to:
        base = base.where(AttendanceSession.clock_in <= date_to)
    if employee_id:
        base = base.where(AttendanceSession.employee_id == employee_id)

    sessions = db.scalars(base).all()
    total = len(sessions)
    in_range = sum(1 for s in sessions if s.clock_in_location_status == LocationStatus.IN_RANGE)
    out_of_range = sum(1 for s in sessions if s.clock_in_location_status == LocationStatus.OUT_OF_RANGE)
    unknown = total - in_range - out_of_range
    incident_employees = {s.employee_id for s in sessions if s.clock_in_location_status == LocationStatus.OUT_OF_RANGE}

    return LocationSummary(
        total=total,
        in_range=in_range,
        out_of_range=out_of_range,
        unknown=unknown,
        employees_with_incidents=len(incident_employees),
    )
