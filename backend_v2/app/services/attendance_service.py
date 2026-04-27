from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDenied
from app.core.geo import Coordinates, haversine_distance
from app.core.security import verify_password
from app.models.attendance_session import AttendanceSession
from app.models.company_location import CompanyLocation
from app.models.enums import (
    AttendanceMethod,
    AttendanceStatus,
    LocationPermissionStatus,
    LocationSource,
    LocationStatus,
    UserRole,
)
from app.models.user import User
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.attendance import GeoPayload


class AttendanceService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.attendance = AttendanceRepository(db, company_id=company_id)
        self.employees = EmployeeRepository(db, company_id=company_id)

    def list_sessions(
        self,
        *,
        employee_id: UUID | None = None,
        status: AttendanceStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[AttendanceSession], int]:
        items = self.attendance.list_sessions(
            employee_id=employee_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )
        total = self.attendance.count_sessions(
            employee_id=employee_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )
        return items, total

    def clock_in(
        self,
        *,
        actor: User,
        employee_id: UUID | None,
        method: AttendanceMethod,
        pin: str | None,
        notes: str | None,
        geo: GeoPayload | None = None,
    ) -> AttendanceSession:
        employee = self._resolve_employee(actor, employee_id)
        self._assert_kiosk_pin(actor=actor, employee=employee, method=method, pin=pin)
        if self.attendance.get_open_for_employee(employee.id, lock=True):
            raise ConflictError("Employee already has an open attendance session.")

        geo = geo or GeoPayload()
        dist, loc_status = self._evaluate_location(geo)

        session = AttendanceSession(
            company_id=self.company_id,
            employee_id=employee.id,
            user_id=employee.user_id,
            clock_in=datetime.now(UTC),
            status=AttendanceStatus.OPEN,
            method=method,
            notes=notes,
            created_by_user_id=actor.id,
            # Geolocation
            clock_in_latitude=geo.latitude,
            clock_in_longitude=geo.longitude,
            clock_in_accuracy_meters=geo.accuracy_meters,
            clock_in_location_status=loc_status,
            clock_in_distance_meters=dist,
            location_source=geo.location_source,
            location_permission_status=geo.location_permission_status,
        )
        try:
            self.attendance.add(session)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("Employee already has an open attendance session.") from exc
        return session

    def clock_out(
        self,
        *,
        actor: User,
        employee_id: UUID | None,
        session_id: UUID | None,
        method: AttendanceMethod,
        pin: str | None,
        notes: str | None,
        geo: GeoPayload | None = None,
    ) -> AttendanceSession:
        if session_id:
            session = self.attendance.get(session_id)
            if session is None:
                raise NotFoundError("Attendance session not found.")
            employee = self.employees.get(session.employee_id)
            if employee is None:
                raise NotFoundError("Employee not found.")
            self._ensure_can_manage_employee(actor, employee.user_id)
        else:
            employee = self._resolve_employee(actor, employee_id)
            session = self.attendance.get_open_for_employee(employee.id, lock=True)
            if session is None:
                raise ConflictError("Employee has no open attendance session.")

        self._assert_kiosk_pin(actor=actor, employee=employee, method=method, pin=pin)

        if session.status != AttendanceStatus.OPEN or session.clock_out is not None:
            raise ConflictError("Attendance session is already closed.")

        geo = geo or GeoPayload()
        dist, loc_status = self._evaluate_location(geo)

        closed_at = datetime.now(UTC)
        session.clock_out = closed_at
        # Normalize clock_in to tz-aware before subtraction; SQLite may return tz-naive.
        clock_in = session.clock_in
        if clock_in.tzinfo is None:
            clock_in = clock_in.replace(tzinfo=UTC)
        session.duration_seconds = max(int((closed_at - clock_in).total_seconds()), 0)
        session.status = AttendanceStatus.CLOSED
        session.closed_by_user_id = actor.id
        if notes:
            session.notes = notes if not session.notes else f"{session.notes}\n{notes}"
        # Geolocation
        session.clock_out_latitude = geo.latitude
        session.clock_out_longitude = geo.longitude
        session.clock_out_accuracy_meters = geo.accuracy_meters
        session.clock_out_location_status = loc_status
        session.clock_out_distance_meters = dist
        # Update permission/source only if a new signal arrives
        if geo.location_permission_status != LocationPermissionStatus.UNKNOWN:
            session.location_permission_status = geo.location_permission_status
        if geo.location_source != LocationSource.UNKNOWN:
            session.location_source = geo.location_source

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    # ── Location helpers ──────────────────────────────────────────────────────

    def _evaluate_location(self, geo: GeoPayload) -> tuple[float | None, LocationStatus | None]:
        """Return (distance_meters, LocationStatus | None) for the given payload.

        Returns (None, None) when no coordinates are provided — null in DB means
        'no location data captured'. UNKNOWN is only used when coords are present
        but no work location has been configured with coordinates.
        """
        if geo.latitude is None or geo.longitude is None:
            return None, None

        work_locations = self.db.scalars(
            select(CompanyLocation).where(
                CompanyLocation.company_id == self.company_id,
                CompanyLocation.is_active.is_(True),
                CompanyLocation.latitude.is_not(None),
                CompanyLocation.longitude.is_not(None),
            )
        ).all()

        if not work_locations:
            return None, LocationStatus.UNKNOWN  # coords present but no work location to compare

        point = Coordinates(latitude=geo.latitude, longitude=geo.longitude)
        nearest_dist = float("inf")
        nearest_radius = 100

        for wl in work_locations:
            d = haversine_distance(point, Coordinates(latitude=wl.latitude, longitude=wl.longitude))  # type: ignore[arg-type]
            if d < nearest_dist:
                nearest_dist = d
                nearest_radius = wl.allowed_radius_meters

        status = LocationStatus.IN_RANGE if nearest_dist <= nearest_radius else LocationStatus.OUT_OF_RANGE
        return round(nearest_dist, 1), status

    def _resolve_employee(self, actor: User, employee_id: UUID | None):
        if employee_id:
            employee = self.employees.get_active(employee_id)
            if employee is None:
                raise NotFoundError("Employee not found.")
            self._ensure_can_manage_employee(actor, employee.user_id)
            return employee

        own_employee = self.employees.get_by_user_id(actor.id)
        if own_employee is None:
            raise ConflictError("employee_id is required for users without an employee profile.")
        return own_employee

    def _ensure_can_manage_employee(self, actor: User, employee_user_id: UUID | None) -> None:
        if actor.role in {UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER}:
            return
        if employee_user_id == actor.id:
            return
        raise PermissionDenied("You cannot manage attendance for this employee.")

    def _assert_kiosk_pin(
        self,
        *,
        actor: User,
        employee,
        method: AttendanceMethod,
        pin: str | None,
    ) -> None:
        if method not in {AttendanceMethod.KIOSK, AttendanceMethod.PIN} and not pin:
            return
        if actor.role == UserRole.EMPLOYEE and employee.user_id == actor.id:
            return
        if not pin:
            raise PermissionDenied("A 4-digit kiosk PIN is required for this action.")
        if not employee.pin_hash or not verify_password(pin, employee.pin_hash):
            raise PermissionDenied("Invalid kiosk PIN.")
