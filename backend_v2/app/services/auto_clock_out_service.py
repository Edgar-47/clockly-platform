from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.timezones import tenant_zone
from app.models.attendance_incident import AttendanceIncident
from app.models.company import Company
from app.models.enums import AttendanceIncidentType
from app.models.user import User
from app.repositories.attendance_repository import AttendanceRepository
from app.repositories.company_repository import CompanyRepository
from app.repositories.company_settings_repository import CompanySettingsRepository
from app.services.attendance_service import AttendanceService
from app.services.audit_log import AuditLogService

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AutoClockOutRunResult:
    company_id: UUID
    closed_count: int
    session_ids: list[UUID]


class AutoClockOutService:
    """Close forgotten open attendance sessions using the tenant configured local cutoff."""

    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.company = CompanyRepository(db).get(company_id)
        if self.company is None:
            raise NotFoundError("Company not found.")
        self.settings = CompanySettingsRepository(db, company_id=company_id)
        self.attendance = AttendanceRepository(db, company_id=company_id)

    def run(self, *, actor: User | None = None, now: datetime | None = None, limit: int = 1000) -> AutoClockOutRunResult:
        settings = self.settings.get()
        if settings is None or not settings.auto_clock_out_enabled or settings.auto_clock_out_time is None:
            return AutoClockOutRunResult(company_id=self.company_id, closed_count=0, session_ids=[])

        now_utc = _ensure_aware_utc(now or datetime.now(UTC))
        timezone_name = settings.auto_clock_out_timezone or self.company.timezone
        grace = timedelta(minutes=settings.auto_clock_out_grace_minutes or 0)
        attendance_service = AttendanceService(self.db, company_id=self.company_id)
        sessions = self.attendance.list_open(limit=limit)

        closed_ids: list[UUID] = []
        for session in sessions:
            close_at = self._target_close_at(session.clock_in, now_utc, timezone_name, grace)
            if close_at is None:
                continue
            attendance_service._close_session_automatically(
                session,
                actor=actor,
                close_at=close_at,
                notes="Desfichaje automatico por olvido.",
            )
            incident = self.db.query(AttendanceIncident).filter(
                AttendanceIncident.company_id == self.company_id,
                AttendanceIncident.attendance_session_id == session.id,
                AttendanceIncident.type == AttendanceIncidentType.AUTO_CLOCK_OUT,
            ).one_or_none()
            if incident is not None:
                metadata = dict(incident.metadata_json or {})
                metadata.update(
                    {
                        "configured_by_user_id": (
                            str(settings.auto_clock_out_updated_by_user_id)
                            if settings.auto_clock_out_updated_by_user_id
                            else None
                        ),
                        "configured_at": (
                            settings.auto_clock_out_updated_at.isoformat()
                            if settings.auto_clock_out_updated_at
                            else None
                        ),
                        "executed_at": now_utc.isoformat(),
                    }
                )
                incident.metadata_json = metadata
                self.db.add(incident)
            closed_ids.append(session.id)
            logger.info(
                "Auto clock-out closed session.",
                extra={
                    "company_id": str(self.company_id),
                    "session_id": str(session.id),
                    "employee_id": str(session.employee_id),
                    "close_at": close_at.isoformat(),
                    "timezone": timezone_name,
                },
            )
            AuditLogService(self.db).record(
                "attendance.auto_clock_out_executed",
                company_id=self.company_id,
                actor_user_id=actor.id if actor else settings.auto_clock_out_updated_by_user_id,
                resource_type="attendance_session",
                resource_id=str(session.id),
                metadata={
                    "employee_id": str(session.employee_id),
                    "configured_by_user_id": (
                        str(settings.auto_clock_out_updated_by_user_id)
                        if settings.auto_clock_out_updated_by_user_id
                        else None
                    ),
                    "configured_at": (
                        settings.auto_clock_out_updated_at.isoformat()
                        if settings.auto_clock_out_updated_at
                        else None
                    ),
                    "executed_at": now_utc.isoformat(),
                    "close_at": close_at.isoformat(),
                    "timezone": timezone_name,
                },
            )

        self.db.commit()
        return AutoClockOutRunResult(company_id=self.company_id, closed_count=len(closed_ids), session_ids=closed_ids)

    def _target_close_at(
        self,
        clock_in: datetime,
        now_utc: datetime,
        timezone_name: str,
        grace: timedelta,
    ) -> datetime | None:
        settings = self.settings.get()
        if settings is None or settings.auto_clock_out_time is None:
            return None
        zone = tenant_zone(timezone_name)
        local_now = now_utc.astimezone(zone)
        clock_in_utc = _ensure_aware_utc(clock_in)
        clock_in_local = clock_in_utc.astimezone(zone)
        configured_local = datetime.combine(
            clock_in_local.date(),
            settings.auto_clock_out_time,
            tzinfo=zone,
        )
        eligible_local = configured_local + grace
        if local_now < eligible_local:
            return None
        configured_utc = configured_local.astimezone(UTC)
        if configured_utc <= clock_in_utc:
            return now_utc
        return min(configured_utc, now_utc)


def run_for_all_companies(db: Session, *, now: datetime | None = None) -> list[AutoClockOutRunResult]:
    companies = db.query(Company).filter(Company.is_active.is_(True)).all()
    results: list[AutoClockOutRunResult] = []
    for company in companies:
        results.append(AutoClockOutService(db, company_id=company.id).run(now=now))
    return results


def _ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
