from __future__ import annotations

import calendar
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.core.timezones import date_filter_to_utc, to_tenant_timezone
from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, SalaryType
from app.models.salary import SalaryCalculation, SalaryProfile
from app.models.user import User
from app.repositories.company_repository import CompanyRepository
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.salary import (
    SalaryCalculationGenerateRequest,
    SalaryCalculationLine,
    SalaryCalculationRead,
    SalaryCalculationStoredRead,
    SalaryProfileCreate,
    SalaryProfileUpdate,
)
from app.services.audit_log import AuditLogService

MONEY = Decimal("0.01")
HOURS = Decimal("0.01")
LEGAL_WARNING = "Calculo estimado basado en fichajes registrados. Revisar antes de pagar."


class SalaryService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.company = CompanyRepository(db).get(company_id)
        if self.company is None:
            raise NotFoundError("Company not found.")
        self.employees = EmployeeRepository(db, company_id=company_id)

    def list_profiles(self, *, employee_id: UUID | None = None) -> list[SalaryProfile]:
        statement = (
            select(SalaryProfile)
            .where(SalaryProfile.company_id == self.company_id)
            .order_by(SalaryProfile.employee_id, SalaryProfile.effective_from.desc())
        )
        if employee_id is not None:
            self._employee(employee_id)
            statement = statement.where(SalaryProfile.employee_id == employee_id)
        return list(self.db.scalars(statement))

    def get_profiles_for_employee(self, employee_id: UUID) -> list[SalaryProfile]:
        self._employee(employee_id)
        return list(
            self.db.scalars(
                select(SalaryProfile)
                .where(SalaryProfile.company_id == self.company_id, SalaryProfile.employee_id == employee_id)
                .order_by(SalaryProfile.effective_from.desc())
            )
        )

    def create_profile(self, payload: SalaryProfileCreate, *, actor: User) -> SalaryProfile:
        self._employee(payload.employee_id)
        self._close_previous_open_profile_if_needed(payload)
        self._assert_no_profile_overlap(
            employee_id=payload.employee_id,
            effective_from=payload.effective_from,
            effective_to=payload.effective_to,
        )
        profile = SalaryProfile(
            company_id=self.company_id,
            employee_id=payload.employee_id,
            salary_type=payload.salary_type,
            amount=payload.amount,
            currency=payload.currency,
            effective_from=payload.effective_from,
            effective_to=payload.effective_to,
            created_by_user_id=actor.id,
            notes=payload.notes,
        )
        self.db.add(profile)
        self.db.flush()
        AuditLogService(self.db).record(
            "salary.profile_created",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="salary_profile",
            resource_id=str(profile.id),
            metadata={
                "employee_id": str(payload.employee_id),
                "salary_type": payload.salary_type.value,
                "effective_from": payload.effective_from.isoformat(),
                "effective_to": payload.effective_to.isoformat() if payload.effective_to else None,
            },
        )
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_profile(self, profile_id: UUID, payload: SalaryProfileUpdate, *, actor: User) -> SalaryProfile:
        profile = self._profile(profile_id)
        if payload.effective_to is not None and payload.effective_to < profile.effective_from:
            raise ConflictError("effective_to cannot be earlier than effective_from.")
        if payload.effective_to != profile.effective_to:
            self._assert_no_profile_overlap(
                employee_id=profile.employee_id,
                effective_from=profile.effective_from,
                effective_to=payload.effective_to,
                exclude_profile_id=profile.id,
            )
        profile.effective_to = payload.effective_to
        if "notes" in payload.model_fields_set:
            profile.notes = payload.notes
        self.db.add(profile)
        AuditLogService(self.db).record(
            "salary.profile_updated",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="salary_profile",
            resource_id=str(profile.id),
            metadata={"effective_to": profile.effective_to.isoformat() if profile.effective_to else None},
        )
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def calculate(self, *, employee_id: UUID, period_start: date, period_end: date) -> SalaryCalculationRead:
        if period_end < period_start:
            raise ConflictError("period_end cannot be earlier than period_start.")
        self._employee(employee_id)
        profiles = self._profiles_for_period(employee_id=employee_id, period_start=period_start, period_end=period_end)
        if not profiles:
            raise ConflictError("No salary profile is active for this employee in the selected period.")

        sessions = self._closed_sessions_for_period(employee_id=employee_id, period_start=period_start, period_end=period_end)
        open_sessions_ignored = self._count_open_sessions_in_period(
            employee_id=employee_id,
            period_start=period_start,
            period_end=period_end,
        )
        local_sessions = [_LocalSession.from_session(session, self.company.timezone) for session in sessions]

        lines: list[SalaryCalculationLine] = []
        total_amount = Decimal("0.00")
        all_days: set[date] = set()
        total_seconds = 0
        total_shifts = 0
        incident_count = 0
        currency = profiles[0].currency

        for profile in profiles:
            line_start = max(period_start, profile.effective_from)
            line_end = min(period_end, profile.effective_to or period_end)
            segment_sessions = [
                item for item in local_sessions if line_start <= item.local_clock_in_date <= line_end
            ]
            line_days = {item.local_clock_in_date for item in segment_sessions}
            line_seconds = sum(item.duration_seconds for item in segment_sessions)
            line_hours = _hours(line_seconds)
            line_shifts = len(segment_sessions)
            line_incidents = sum(1 for item in segment_sessions if item.has_incident)
            line_amount = self._amount_for_profile(
                profile,
                line_start=line_start,
                line_end=line_end,
                total_hours=line_hours,
                total_days=len(line_days),
                total_shifts=line_shifts,
            )
            total_amount += line_amount
            all_days.update(line_days)
            total_seconds += line_seconds
            total_shifts += line_shifts
            incident_count += line_incidents
            currency = profile.currency
            lines.append(
                SalaryCalculationLine(
                    salary_profile_id=profile.id,
                    salary_type=profile.salary_type,
                    amount=profile.amount,
                    currency=profile.currency,
                    period_start=line_start,
                    period_end=line_end,
                    total_hours=line_hours,
                    total_days=len(line_days),
                    total_shifts=line_shifts,
                    incident_count=line_incidents,
                    gross_estimated_amount=line_amount,
                )
            )

        return SalaryCalculationRead(
            employee_id=employee_id,
            period_start=period_start,
            period_end=period_end,
            currency=currency,
            gross_estimated_amount=_money(total_amount),
            total_hours=_hours(total_seconds),
            total_days=len(all_days),
            total_shifts=total_shifts,
            incident_count=incident_count,
            open_sessions_ignored=open_sessions_ignored,
            lines=lines,
            warning=LEGAL_WARNING,
        )

    def generate(self, payload: SalaryCalculationGenerateRequest, *, actor: User) -> SalaryCalculationStoredRead:
        calculation = self.calculate(
            employee_id=payload.employee_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
        )
        generated_at = datetime.now(UTC)
        stored = SalaryCalculation(
            company_id=self.company_id,
            employee_id=payload.employee_id,
            period_start=payload.period_start,
            period_end=payload.period_end,
            gross_estimated_amount=calculation.gross_estimated_amount,
            total_hours=calculation.total_hours,
            total_days=calculation.total_days,
            total_shifts=calculation.total_shifts,
            generated_by_user_id=actor.id,
            generated_at=generated_at,
            metadata_json={
                "incident_count": calculation.incident_count,
                "open_sessions_ignored": calculation.open_sessions_ignored,
                "warning": calculation.warning,
                "lines": [_json_line(line) for line in calculation.lines],
            },
        )
        self.db.add(stored)
        self.db.flush()
        AuditLogService(self.db).record(
            "salary.calculation_generated",
            company_id=self.company_id,
            actor_user_id=actor.id,
            resource_type="salary_calculation",
            resource_id=str(stored.id),
            metadata={
                "employee_id": str(payload.employee_id),
                "period_start": payload.period_start.isoformat(),
                "period_end": payload.period_end.isoformat(),
                "gross_estimated_amount": str(calculation.gross_estimated_amount),
            },
        )
        self.db.commit()
        self.db.refresh(stored)
        return SalaryCalculationStoredRead(
            **calculation.model_dump(),
            id=stored.id,
            generated_by_user_id=stored.generated_by_user_id,
            generated_at=stored.generated_at,
        )

    def _amount_for_profile(
        self,
        profile: SalaryProfile,
        *,
        line_start: date,
        line_end: date,
        total_hours: Decimal,
        total_days: int,
        total_shifts: int,
    ) -> Decimal:
        amount = Decimal(profile.amount)
        if profile.salary_type == SalaryType.HOURLY:
            return _money(total_hours * amount)
        if profile.salary_type == SalaryType.DAILY:
            return _money(Decimal(total_days) * amount)
        if profile.salary_type == SalaryType.SHIFT:
            return _money(Decimal(total_shifts) * amount)
        if profile.salary_type == SalaryType.WEEKLY:
            days = Decimal((line_end - line_start).days + 1)
            return _money((days / Decimal(7)) * amount)
        if profile.salary_type == SalaryType.MONTHLY:
            return _money(_monthly_proration(amount, line_start, line_end))
        raise ConflictError("Unsupported salary type.")

    def _employee(self, employee_id: UUID) -> Employee:
        employee = self.employees.get(employee_id)
        if employee is None:
            raise NotFoundError("Employee not found.")
        return employee

    def _profile(self, profile_id: UUID) -> SalaryProfile:
        profile = self.db.scalar(
            select(SalaryProfile).where(SalaryProfile.id == profile_id, SalaryProfile.company_id == self.company_id)
        )
        if profile is None:
            raise NotFoundError("Salary profile not found.")
        return profile

    def _profiles_for_period(self, *, employee_id: UUID, period_start: date, period_end: date) -> list[SalaryProfile]:
        return list(
            self.db.scalars(
                select(SalaryProfile)
                .where(
                    SalaryProfile.company_id == self.company_id,
                    SalaryProfile.employee_id == employee_id,
                    SalaryProfile.effective_from <= period_end,
                    or_(SalaryProfile.effective_to.is_(None), SalaryProfile.effective_to >= period_start),
                )
                .order_by(SalaryProfile.effective_from.asc())
            )
        )

    def _closed_sessions_for_period(self, *, employee_id: UUID, period_start: date, period_end: date) -> list[AttendanceSession]:
        date_from = date_filter_to_utc(period_start, default_timezone=self.company.timezone)
        date_to = date_filter_to_utc(period_end, default_timezone=self.company.timezone, end_of_day=True)
        return list(
            self.db.scalars(
                select(AttendanceSession)
                .where(
                    AttendanceSession.company_id == self.company_id,
                    AttendanceSession.employee_id == employee_id,
                    AttendanceSession.status == AttendanceStatus.CLOSED,
                    AttendanceSession.clock_in >= date_from,
                    AttendanceSession.clock_in <= date_to,
                )
                .order_by(AttendanceSession.clock_in.asc())
            )
        )

    def _count_open_sessions_in_period(self, *, employee_id: UUID, period_start: date, period_end: date) -> int:
        date_from = date_filter_to_utc(period_start, default_timezone=self.company.timezone)
        date_to = date_filter_to_utc(period_end, default_timezone=self.company.timezone, end_of_day=True)
        return int(
            self.db.scalar(
                select(func.count(AttendanceSession.id))
                .where(
                    AttendanceSession.company_id == self.company_id,
                    AttendanceSession.employee_id == employee_id,
                    AttendanceSession.status == AttendanceStatus.OPEN,
                    AttendanceSession.clock_in >= date_from,
                    AttendanceSession.clock_in <= date_to,
                )
            )
            or 0
        )

    def _close_previous_open_profile_if_needed(self, payload: SalaryProfileCreate) -> None:
        previous = self.db.scalar(
            select(SalaryProfile)
            .where(
                SalaryProfile.company_id == self.company_id,
                SalaryProfile.employee_id == payload.employee_id,
                SalaryProfile.effective_to.is_(None),
                SalaryProfile.effective_from < payload.effective_from,
            )
            .order_by(SalaryProfile.effective_from.desc())
            .limit(1)
        )
        if previous is not None:
            previous.effective_to = payload.effective_from - timedelta(days=1)
            self.db.add(previous)
            self.db.flush()

    def _assert_no_profile_overlap(
        self,
        *,
        employee_id: UUID,
        effective_from: date,
        effective_to: date | None,
        exclude_profile_id: UUID | None = None,
    ) -> None:
        end = effective_to or date.max
        statement = select(SalaryProfile).where(
            SalaryProfile.company_id == self.company_id,
            SalaryProfile.employee_id == employee_id,
            SalaryProfile.effective_from <= end,
            or_(SalaryProfile.effective_to.is_(None), SalaryProfile.effective_to >= effective_from),
        )
        if exclude_profile_id is not None:
            statement = statement.where(SalaryProfile.id != exclude_profile_id)
        existing = self.db.scalar(statement.limit(1))
        if existing is not None:
            raise ConflictError("Salary profile period overlaps an existing profile.")


class _LocalSession:
    def __init__(self, *, local_clock_in_date: date, duration_seconds: int, has_incident: bool) -> None:
        self.local_clock_in_date = local_clock_in_date
        self.duration_seconds = duration_seconds
        self.has_incident = has_incident

    @classmethod
    def from_session(cls, session: AttendanceSession, timezone: str) -> "_LocalSession":
        local_clock_in = to_tenant_timezone(session.clock_in, timezone)
        return cls(
            local_clock_in_date=(local_clock_in or session.clock_in).date(),
            duration_seconds=session.duration_seconds or 0,
            has_incident=bool(session.has_incident or session.incidents),
        )


def _hours(total_seconds: int) -> Decimal:
    return (Decimal(total_seconds) / Decimal(3600)).quantize(HOURS, rounding=ROUND_HALF_UP)


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)


def _monthly_proration(amount: Decimal, start: date, end: date) -> Decimal:
    total = Decimal("0")
    current = start
    while current <= end:
        days_in_month = calendar.monthrange(current.year, current.month)[1]
        month_end = date(current.year, current.month, days_in_month)
        segment_end = min(month_end, end)
        days = Decimal((segment_end - current).days + 1)
        total += amount * (days / Decimal(days_in_month))
        current = segment_end + timedelta(days=1)
    return total


def _json_line(line: SalaryCalculationLine) -> dict[str, str | int]:
    payload = line.model_dump()
    return {
        key: value.isoformat() if isinstance(value, date) else str(value) if isinstance(value, (Decimal, UUID)) else value
        for key, value in payload.items()
    }
