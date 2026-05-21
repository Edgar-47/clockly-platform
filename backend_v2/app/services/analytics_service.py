from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import cast, Date, func, select
from sqlalchemy.orm import Session

from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, ClockOutSource
from app.models.late_arrival import LateArrival
from app.schemas.analytics import (
    Anomaly,
    AnomaliesResponse,
    DailyTrend,
    PunctualityEmployee,
    PunctualityRanking,
    TrendsResponse,
)

_PERIOD_DAYS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90, "12m": 365}


class AnalyticsService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    # ------------------------------------------------------------------
    # Time-series trends
    # ------------------------------------------------------------------

    def trends(self, period: str) -> TrendsResponse:
        days = _PERIOD_DAYS.get(period, 30)
        now = datetime.now(UTC)
        date_to = now
        date_from = now - timedelta(days=days)

        current_data = self._daily_totals(date_from, date_to)
        prev_date_from = date_from - timedelta(days=days)
        prev_data = self._daily_totals(prev_date_from, date_from)

        current_total = sum(d.worked_seconds for d in current_data)
        prev_total = sum(d.worked_seconds for d in prev_data)

        comparison_pct: float | None = None
        if prev_total > 0:
            comparison_pct = round((current_total - prev_total) / prev_total * 100, 1)

        avg_daily = (current_total // days) if days > 0 else 0
        peak: DailyTrend | None = max(current_data, key=lambda d: d.worked_seconds, default=None)

        return TrendsResponse(
            period=period,
            data=current_data,
            total_worked_seconds=current_total,
            avg_daily_seconds=avg_daily,
            peak_day=peak.date if peak else None,
            peak_seconds=peak.worked_seconds if peak else 0,
            comparison_pct=comparison_pct,
        )

    def _daily_totals(self, date_from: datetime, date_to: datetime) -> list[DailyTrend]:
        day_col = cast(AttendanceSession.clock_in, Date)
        rows = self.db.execute(
            select(
                day_col.label("day"),
                func.coalesce(func.sum(AttendanceSession.duration_seconds), 0).label("worked"),
                func.count(AttendanceSession.id).label("sessions"),
            )
            .where(
                AttendanceSession.company_id == self.company_id,
                AttendanceSession.status == AttendanceStatus.CLOSED,
                AttendanceSession.clock_in >= date_from,
                AttendanceSession.clock_in < date_to,
            )
            .group_by(day_col)
            .order_by(day_col)
        ).fetchall()
        return [DailyTrend(date=row.day, worked_seconds=row.worked, sessions_count=row.sessions) for row in rows]

    # ------------------------------------------------------------------
    # Punctuality ranking
    # ------------------------------------------------------------------

    def punctuality_ranking(
        self,
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> PunctualityRanking:
        # Total closed sessions per employee
        session_stmt = (
            select(
                AttendanceSession.employee_id,
                func.count(AttendanceSession.id).label("total"),
            )
            .where(
                AttendanceSession.company_id == self.company_id,
                AttendanceSession.status == AttendanceStatus.CLOSED,
            )
        )
        if date_from:
            session_stmt = session_stmt.where(AttendanceSession.clock_in >= date_from)
        if date_to:
            session_stmt = session_stmt.where(AttendanceSession.clock_in < date_to)
        session_stmt = session_stmt.group_by(AttendanceSession.employee_id)
        session_rows = {row.employee_id: row.total for row in self.db.execute(session_stmt).fetchall()}

        if not session_rows:
            return PunctualityRanking(employees=[])

        # Late arrivals per employee
        late_stmt = (
            select(
                LateArrival.employee_id,
                func.count(LateArrival.id).label("late_count"),
            )
            .where(LateArrival.company_id == self.company_id)
        )
        if date_from:
            late_stmt = late_stmt.where(LateArrival.date >= date_from.date())
        if date_to:
            late_stmt = late_stmt.where(LateArrival.date < date_to.date())
        late_stmt = late_stmt.group_by(LateArrival.employee_id)
        late_rows = {row.employee_id: row.late_count for row in self.db.execute(late_stmt).fetchall()}

        # Employee names
        employee_ids = list(session_rows.keys())
        name_rows = self.db.execute(
            select(Employee.id, Employee.first_name, Employee.last_name).where(
                Employee.id.in_(employee_ids),
                Employee.company_id == self.company_id,
            )
        ).fetchall()
        names = {row.id: f"{row.first_name} {row.last_name}".strip() for row in name_rows}

        employees: list[PunctualityEmployee] = []
        for emp_id, total in session_rows.items():
            late = late_rows.get(emp_id, 0)
            on_time = max(0, total - late)
            rate = on_time / total if total > 0 else 1.0
            employees.append(
                PunctualityEmployee(
                    employee_id=emp_id,
                    employee_name=names.get(emp_id, "Desconocido"),
                    late_count=late,
                    on_time_count=on_time,
                    total_sessions=total,
                    punctuality_rate=round(rate, 3),
                )
            )

        employees.sort(key=lambda e: e.punctuality_rate, reverse=True)
        return PunctualityRanking(employees=employees)

    # ------------------------------------------------------------------
    # Anomaly detection
    # ------------------------------------------------------------------

    def anomalies(self, days: int = 30) -> AnomaliesResponse:
        date_from = datetime.now(UTC) - timedelta(days=days)
        found: list[Anomaly] = []
        employee_name_col = (
            func.coalesce(Employee.first_name, "") + " " + func.coalesce(Employee.last_name, "")
        ).label("employee_name")

        # 1. Frequent late arrivals (≥ 3 in period) — JOIN to get name in same query
        late_counts = self.db.execute(
            select(
                LateArrival.employee_id,
                func.count(LateArrival.id).label("n"),
                employee_name_col,
            )
            .join(Employee, Employee.id == LateArrival.employee_id)
            .where(
                LateArrival.company_id == self.company_id,
                LateArrival.date >= date_from.date(),
            )
            .group_by(LateArrival.employee_id, Employee.first_name, Employee.last_name)
            .having(func.count(LateArrival.id) >= 3)
        ).fetchall()
        for row in late_counts:
            found.append(
                Anomaly(
                    employee_id=row.employee_id,
                    employee_name=row.employee_name.strip() or "Desconocido",
                    anomaly_type="frequent_late",
                    count=row.n,
                    description=f"{row.n} retrasos en los últimos {days} días.",
                )
            )

        # 2. Very long sessions (> 12 hours) — JOIN to get name in same query
        long_sessions = self.db.execute(
            select(
                AttendanceSession.employee_id,
                func.count(AttendanceSession.id).label("n"),
                employee_name_col,
            )
            .join(Employee, Employee.id == AttendanceSession.employee_id)
            .where(
                AttendanceSession.company_id == self.company_id,
                AttendanceSession.status == AttendanceStatus.CLOSED,
                AttendanceSession.duration_seconds > 12 * 3600,
                AttendanceSession.clock_in >= date_from,
            )
            .group_by(AttendanceSession.employee_id, Employee.first_name, Employee.last_name)
        ).fetchall()
        for row in long_sessions:
            found.append(
                Anomaly(
                    employee_id=row.employee_id,
                    employee_name=row.employee_name.strip() or "Desconocido",
                    anomaly_type="long_session",
                    count=row.n,
                    description=f"{row.n} jornada(s) de más de 12h en los últimos {days} días.",
                )
            )

        # 3. Frequent auto clock-outs (≥ 2 in period) — JOIN to get name in same query
        auto_out = self.db.execute(
            select(
                AttendanceSession.employee_id,
                func.count(AttendanceSession.id).label("n"),
                employee_name_col,
            )
            .join(Employee, Employee.id == AttendanceSession.employee_id)
            .where(
                AttendanceSession.company_id == self.company_id,
                AttendanceSession.clock_out_source == ClockOutSource.AUTO,
                AttendanceSession.clock_in >= date_from,
            )
            .group_by(AttendanceSession.employee_id, Employee.first_name, Employee.last_name)
            .having(func.count(AttendanceSession.id) >= 2)
        ).fetchall()
        for row in auto_out:
            found.append(
                Anomaly(
                    employee_id=row.employee_id,
                    employee_name=row.employee_name.strip() or "Desconocido",
                    anomaly_type="auto_clockout",
                    count=row.n,
                    description=f"{row.n} salida(s) automática(s) sin fichar en los últimos {days} días.",
                )
            )

        return AnomaliesResponse(anomalies=found, period_days=days)
