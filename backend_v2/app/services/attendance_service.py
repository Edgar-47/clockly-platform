import uuid as _uuid
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, PermissionDenied
from app.core.geo import Coordinates, haversine_distance
from app.core.security import verify_password
from app.core.timezones import duration_seconds, ensure_utc
from app.models.attendance_session import AttendanceSession
from app.models.company_location import CompanyLocation
from app.models.attendance_incident import AttendanceIncident
from app.models.enums import (
    AttendanceIncidentType,
    AttendanceMethod,
    AttendanceStatus,
    ClockOutSource,
    IncidentStatus,
    LocationPermissionStatus,
    LocationSource,
    LocationStatus,
    UserRole,
)
from app.models.user import User
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.company_repository import CompanyRepository
from app.repositories.company_settings_repository import CompanySettingsRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.attendance import AttendanceSessionAdminUpdate, AutoCloseOpenSessionsRequest, GeoPayload
from app.models.late_arrival import LateArrival
from app.models.enums import LateArrivalStatus
from app.services.plans import PlanRequiredError, check_company_plan_feature, record_company_usage


class AttendanceService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.company = CompanyRepository(db).get(company_id)
        if self.company is None:
            raise NotFoundError("Company not found.")
        self.attendance = AttendanceRepository(db, company_id=company_id)
        self.employees = EmployeeRepository(db, company_id=company_id)
        self.settings = CompanySettingsRepository(db, company_id=company_id)

    def list_sessions(
        self,
        *,
        employee_id: UUID | None = None,
        status: AttendanceStatus | None = None,
        clock_out_source: ClockOutSource | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[AttendanceSession], int]:
        date_from = self._to_utc(date_from)
        date_to = self._to_utc(date_to)
        items = self.attendance.list_sessions(
            employee_id=employee_id,
            status=status,
            clock_out_source=clock_out_source,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
        )
        total = self.attendance.count_sessions(
            employee_id=employee_id,
            status=status,
            clock_out_source=clock_out_source,
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
        auto_close_open_session: bool = False,
    ) -> AttendanceSession:
        employee = self._resolve_employee(actor, employee_id)
        self._assert_kiosk_pin(actor=actor, employee=employee, method=method, pin=pin)
        open_session = self.attendance.get_open_for_employee(employee.id, lock=True)
        if open_session is not None:
            open_session = self._maybe_auto_close_open_session(
                open_session,
                actor=actor,
                requested=auto_close_open_session,
            )
        if open_session is not None:
            raise ConflictError("Employee already has an open attendance session.")

        geo = self._plan_checked_geo(geo or GeoPayload(), actor=actor)
        dist, loc_status = self._evaluate_location(geo)

        now = datetime.now(UTC)
        session = AttendanceSession(
            company_id=self.company_id,
            employee_id=employee.id,
            user_id=employee.user_id,
            clock_in=now,
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
            self._maybe_record_late_arrival(session, employee=employee, clock_in_time=now)
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

        geo = self._plan_checked_geo(geo or GeoPayload(), actor=actor)
        dist, loc_status = self._evaluate_location(geo)

        closed_at = datetime.now(UTC)
        session.clock_out = closed_at
        session.duration_seconds = duration_seconds(session.clock_in, closed_at)
        session.status = AttendanceStatus.CLOSED
        session.closed_by_user_id = actor.id
        session.clock_out_source = self._clock_out_source_for_actor(actor)
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

    def update_session(
        self,
        *,
        session_id: UUID,
        payload: AttendanceSessionAdminUpdate,
        actor: User,
    ) -> AttendanceSession:
        if actor.role not in {UserRole.OWNER, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER}:
            raise PermissionDenied("Admin access required.")

        session = self.attendance.get(session_id)
        if session is None:
            raise NotFoundError("Attendance session not found.")

        updates = payload.model_dump(exclude_unset=True)
        clock_in = self._to_utc(updates.get("clock_in")) if "clock_in" in updates else session.clock_in
        clock_out = self._to_utc(updates.get("clock_out")) if "clock_out" in updates else session.clock_out

        if clock_in is None:
            raise ConflictError("clock_in is required.")
        if clock_out is not None and clock_out < clock_in:
            raise ConflictError("clock_out cannot be earlier than clock_in.")

        other_open = self.attendance.get_open_for_employee(
            session.employee_id,
            lock=True,
            exclude_session_id=session.id,
        )
        if clock_out is None and other_open is not None:
            raise ConflictError("Employee already has another open attendance session.")

        overlapping = self.attendance.find_overlapping_session(
            employee_id=session.employee_id,
            clock_in=clock_in,
            clock_out=clock_out,
            exclude_session_id=session.id,
        )
        if overlapping is not None:
            raise ConflictError("Edited attendance session overlaps an existing session.")

        session.clock_in = clock_in
        session.clock_out = clock_out
        session.status = AttendanceStatus.CLOSED if clock_out is not None else AttendanceStatus.OPEN
        session.duration_seconds = duration_seconds(clock_in, clock_out) if clock_out is not None else None
        if clock_out is not None:
            session.clock_out_source = ClockOutSource.MANUAL
        else:
            session.clock_out_source = None
        if "notes" in updates:
            session.notes = updates["notes"]
        if updates.get("mark_corrected", True):
            session.is_corrected = True
            session.corrected_by_user_id = actor.id
            session.corrected_at = datetime.now(UTC)

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def auto_close_open_sessions(
        self,
        *,
        payload: AutoCloseOpenSessionsRequest,
        actor: User,
    ) -> list[AttendanceSession]:
        if actor.role not in {UserRole.OWNER, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER}:
            raise PermissionDenied("Admin access required.")

        settings = self.settings.get_or_create()
        older_than_hours = payload.older_than_hours or settings.auto_close_after_hours
        cutoff = datetime.now(UTC) - timedelta(hours=older_than_hours)
        close_at = self._to_utc(payload.close_at) if payload.close_at else None
        sessions = self.attendance.list_open_older_than(cutoff)

        closed: list[AttendanceSession] = []
        for session in sessions:
            target_close_at = close_at or self._auto_close_at(session, older_than_hours)
            self._close_session_automatically(
                session,
                actor=actor,
                close_at=target_close_at,
                notes=payload.notes,
            )
            closed.append(session)

        self.db.commit()
        for session in closed:
            self.db.refresh(session)
        return closed

    # Location helpers

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

    def _plan_checked_geo(self, geo: GeoPayload, *, actor: User) -> GeoPayload:
        if geo.latitude is None and geo.longitude is None:
            return geo
        try:
            check_company_plan_feature(self.company, "has_geolocation")
        except PlanRequiredError:
            record_company_usage(
                self.db,
                company_id=self.company_id,
                feature_name="has_geolocation",
                action="blocked",
                actor_user_id=actor.id,
            )
            raise
        record_company_usage(
            self.db,
            company_id=self.company_id,
            feature_name="has_geolocation",
            action="allowed",
            actor_user_id=actor.id,
        )
        return geo

    def _maybe_auto_close_open_session(
        self,
        session: AttendanceSession,
        *,
        actor: User,
        requested: bool,
    ) -> AttendanceSession | None:
        settings = self.settings.get_or_create()
        if not requested and not settings.auto_close_open_sessions:
            return session
        close_at = self._auto_close_at(session, settings.auto_close_after_hours)
        if close_at > datetime.now(UTC):
            return session
        self._close_session_automatically(
            session,
            actor=actor,
            close_at=close_at,
            notes="Cierre automático de sesión abierta.",
        )
        self.db.flush()
        return None

    def _close_session_automatically(
        self,
        session: AttendanceSession,
        *,
        actor: User | None,
        close_at: datetime,
        notes: str | None,
    ) -> None:
        clock_in = self._to_utc(session.clock_in)
        close_at = self._to_utc(close_at)
        if close_at is None or clock_in is None:
            raise ConflictError("Invalid attendance timestamps.")
        if close_at < clock_in:
            close_at = clock_in
        session.clock_in = clock_in
        session.clock_out = close_at
        session.duration_seconds = duration_seconds(clock_in, close_at)
        session.status = AttendanceStatus.CLOSED
        session.closed_by_user_id = actor.id if actor else None
        session.corrected_by_user_id = actor.id if actor else None
        session.corrected_at = datetime.now(UTC)
        session.is_corrected = True
        session.auto_closed = True
        session.clock_out_source = ClockOutSource.AUTO
        session.has_incident = True
        session.incident_type = AttendanceIncidentType.AUTO_CLOCK_OUT
        session.closed_automatically_at = datetime.now(UTC)
        if notes:
            session.notes = notes if not session.notes else f"{session.notes}\n{notes}"
        self.db.add(session)
        self.db.flush()
        self._ensure_auto_clock_out_incident(session, actor=actor, close_at=close_at)

    def _ensure_auto_clock_out_incident(
        self,
        session: AttendanceSession,
        *,
        actor: User | None,
        close_at: datetime,
    ) -> AttendanceIncident:
        existing = self.db.scalar(
            select(AttendanceIncident).where(
                AttendanceIncident.company_id == self.company_id,
                AttendanceIncident.attendance_session_id == session.id,
                AttendanceIncident.type == AttendanceIncidentType.AUTO_CLOCK_OUT,
            )
        )
        if existing is not None:
            return existing
        incident = AttendanceIncident(
            company_id=self.company_id,
            employee_id=session.employee_id,
            attendance_session_id=session.id,
            type=AttendanceIncidentType.AUTO_CLOCK_OUT,
            status=IncidentStatus.OPEN,
            title="Desfichaje automático por olvido",
            description="La sesión fue cerrada automáticamente al superar la hora límite configurada.",
            metadata_json={
                "closed_at": close_at.isoformat(),
                "configured_by_user_id": str(actor.id) if actor else None,
                "session_id": str(session.id),
                "employee_id": str(session.employee_id),
            },
        )
        self.db.add(incident)
        return incident

    def _auto_close_at(self, session: AttendanceSession, older_than_hours: int) -> datetime:
        clock_in = self._to_utc(session.clock_in)
        if clock_in is None:
            raise ConflictError("Invalid attendance session.")
        return clock_in + timedelta(hours=older_than_hours)

    def _to_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        return ensure_utc(value, default_timezone=self.company.timezone)

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
        if actor.role in {UserRole.OWNER, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER}:
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
        if actor.role == UserRole.EMPLOYEE:
            raise PermissionDenied("Kiosk requires an authenticated admin session.")
        if actor.role not in {UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER}:
            raise PermissionDenied("Kiosk access requires an authenticated admin session.")
        if not pin:
            raise PermissionDenied("Introduce tu PIN de 4 digitos.")
        if not employee.pin_hash or not verify_password(pin, employee.pin_hash):
            raise PermissionDenied("PIN incorrecto.")

    def _clock_out_source_for_actor(self, actor: User) -> ClockOutSource:
        if actor.role == UserRole.EMPLOYEE:
            return ClockOutSource.EMPLOYEE
        return ClockOutSource.ADMIN

    def _maybe_record_late_arrival(
        self,
        session: AttendanceSession,
        *,
        employee,
        clock_in_time: datetime,
    ) -> LateArrival | None:
        """Create a LateArrival record if the employee clocked in after the grace window.

        Logic:
        1. Company must have late_arrivals_enabled = True.
        2. Employee must have an assigned schedule.
        3. Today must be a working day in that schedule.
        4. delay = clock_in (local time) - scheduled entry_time
        5. delay_after_grace = delay - grace_period_minutes
        6. If delay_after_grace > 0 → create record (idempotent via unique constraint).
        """
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        settings = self.settings.get_or_create()
        if not settings.late_arrivals_enabled:
            return None

        schedule = employee.schedule
        if schedule is None or not schedule.is_active:
            return None

        # Convert UTC clock-in to company local time for comparison
        try:
            tz = ZoneInfo(self.company.timezone or "UTC")
        except ZoneInfoNotFoundError:
            tz = ZoneInfo("UTC")

        local_clock_in = clock_in_time.astimezone(tz)
        local_date = local_clock_in.date()
        weekday = local_date.weekday()  # 0=Mon…6=Sun

        day_flags = [
            schedule.monday,
            schedule.tuesday,
            schedule.wednesday,
            schedule.thursday,
            schedule.friday,
            schedule.saturday,
            schedule.sunday,
        ]
        if not day_flags[weekday]:
            return None

        # Both times in minutes from midnight for arithmetic
        scheduled_minutes = schedule.entry_time.hour * 60 + schedule.entry_time.minute
        actual_minutes = local_clock_in.hour * 60 + local_clock_in.minute

        delay_total = actual_minutes - scheduled_minutes
        if delay_total <= 0:
            return None  # on time or early

        grace = settings.late_arrival_grace_minutes
        delay_after_grace = delay_total - grace
        if delay_after_grace <= 0:
            return None  # within grace period

        late = LateArrival(
            id=_uuid.uuid4(),
            company_id=self.company_id,
            employee_id=employee.id,
            attendance_session_id=session.id,
            schedule_id=schedule.id,
            date=local_date,
            scheduled_start_time=schedule.entry_time,
            actual_clock_in_time=local_clock_in.time().replace(second=0, microsecond=0),
            delay_minutes_total=delay_total,
            delay_minutes_after_grace=delay_after_grace,
            grace_period_minutes=grace,
            clock_in_method=session.method,
            status=LateArrivalStatus.PENDING,
        )
        self.db.add(late)
        self.db.flush()
        return late
