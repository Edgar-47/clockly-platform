from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import LateArrivalStatus
from app.models.late_arrival import LateArrival


class LateArrivalRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    # ── Base ──────────────────────────────────────────────────────────────────

    def _base(self):
        return select(LateArrival).where(LateArrival.company_id == self.company_id)

    def _apply_filters(
        self,
        stmt,
        *,
        employee_id: UUID | None = None,
        status: LateArrivalStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        min_delay_minutes: int | None = None,
        max_delay_minutes: int | None = None,
    ):
        if employee_id is not None:
            stmt = stmt.where(LateArrival.employee_id == employee_id)
        if status is not None:
            stmt = stmt.where(LateArrival.status == status)
        if date_from is not None:
            stmt = stmt.where(LateArrival.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(LateArrival.date <= date_to)
        if min_delay_minutes is not None:
            stmt = stmt.where(LateArrival.delay_minutes_total >= min_delay_minutes)
        if max_delay_minutes is not None:
            stmt = stmt.where(LateArrival.delay_minutes_total <= max_delay_minutes)
        return stmt

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(
        self,
        *,
        employee_id: UUID | None = None,
        status: LateArrivalStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        min_delay_minutes: int | None = None,
        max_delay_minutes: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[LateArrival]:
        stmt = self._base()
        stmt = self._apply_filters(
            stmt,
            employee_id=employee_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            min_delay_minutes=min_delay_minutes,
            max_delay_minutes=max_delay_minutes,
        )
        stmt = (
            stmt.options(
                selectinload(LateArrival.employee),
                selectinload(LateArrival.reviewed_by),
            )
            .order_by(LateArrival.date.desc(), LateArrival.actual_clock_in_time.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(self.db.scalars(stmt))

    def count(
        self,
        *,
        employee_id: UUID | None = None,
        status: LateArrivalStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        min_delay_minutes: int | None = None,
        max_delay_minutes: int | None = None,
    ) -> int:
        stmt = select(func.count(LateArrival.id)).where(
            LateArrival.company_id == self.company_id
        )
        stmt = self._apply_filters(
            stmt,
            employee_id=employee_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
            min_delay_minutes=min_delay_minutes,
            max_delay_minutes=max_delay_minutes,
        )
        return int(self.db.scalar(stmt) or 0)

    def get(self, late_arrival_id: UUID) -> LateArrival | None:
        return self.db.scalar(
            select(LateArrival)
            .where(
                LateArrival.id == late_arrival_id,
                LateArrival.company_id == self.company_id,
            )
            .options(
                selectinload(LateArrival.employee),
                selectinload(LateArrival.reviewed_by),
                selectinload(LateArrival.attendance_session),
            )
        )

    def get_by_session(self, attendance_session_id: UUID) -> LateArrival | None:
        return self.db.scalar(
            select(LateArrival).where(
                LateArrival.attendance_session_id == attendance_session_id,
                LateArrival.company_id == self.company_id,
            )
        )

    def add(self, late_arrival: LateArrival) -> LateArrival:
        self.db.add(late_arrival)
        self.db.flush()
        return late_arrival

    # ── Analytics ─────────────────────────────────────────────────────────────

    def stats(
        self,
        *,
        employee_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> dict[str, Any]:
        base_where = [LateArrival.company_id == self.company_id]
        if employee_id:
            base_where.append(LateArrival.employee_id == employee_id)
        if date_from:
            base_where.append(LateArrival.date >= date_from)
        if date_to:
            base_where.append(LateArrival.date <= date_to)

        row = self.db.execute(
            select(
                func.count(LateArrival.id).label("total_count"),
                func.coalesce(func.sum(LateArrival.delay_minutes_total), 0).label("total_delay"),
                func.coalesce(
                    func.sum(case((LateArrival.status == LateArrivalStatus.PENDING, 1), else_=0)), 0
                ).label("pending_count"),
                func.coalesce(
                    func.sum(case((LateArrival.status == LateArrivalStatus.JUSTIFIED, 1), else_=0)), 0
                ).label("justified_count"),
                func.coalesce(
                    func.sum(case((LateArrival.status == LateArrivalStatus.UNJUSTIFIED, 1), else_=0)), 0
                ).label("unjustified_count"),
                func.coalesce(
                    func.sum(case((LateArrival.status == LateArrivalStatus.IGNORED, 1), else_=0)), 0
                ).label("ignored_count"),
            ).where(*base_where)
        ).one()

        total = int(row.total_count or 0)
        total_delay = int(row.total_delay or 0)
        return {
            "total_count": total,
            "pending_count": int(row.pending_count or 0),
            "justified_count": int(row.justified_count or 0),
            "unjustified_count": int(row.unjustified_count or 0),
            "ignored_count": int(row.ignored_count or 0),
            "total_delay_minutes": total_delay,
            "avg_delay_minutes": round(total_delay / total, 1) if total else 0.0,
            "punctuality_rate": 0.0,  # computed in service using total attendance sessions
        }

    def chart_by_day(
        self,
        *,
        employee_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict]:
        base_where = [LateArrival.company_id == self.company_id]
        if employee_id:
            base_where.append(LateArrival.employee_id == employee_id)
        if date_from:
            base_where.append(LateArrival.date >= date_from)
        if date_to:
            base_where.append(LateArrival.date <= date_to)

        rows = self.db.execute(
            select(
                LateArrival.date.label("label"),
                func.count(LateArrival.id).label("count"),
                func.coalesce(func.sum(LateArrival.delay_minutes_total), 0).label("total_minutes"),
            )
            .where(*base_where)
            .group_by(LateArrival.date)
            .order_by(LateArrival.date)
            .limit(90)
        ).fetchall()
        return [{"label": str(r.label), "count": r.count, "total_minutes": r.total_minutes} for r in rows]

    def chart_by_month(
        self,
        *,
        employee_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[dict]:
        base_where = [LateArrival.company_id == self.company_id]
        if employee_id:
            base_where.append(LateArrival.employee_id == employee_id)
        if date_from:
            base_where.append(LateArrival.date >= date_from)
        if date_to:
            base_where.append(LateArrival.date <= date_to)

        month_label = self._month_label_expr()
        rows = self.db.execute(
            select(
                month_label.label("label"),
                func.count(LateArrival.id).label("count"),
                func.coalesce(func.sum(LateArrival.delay_minutes_total), 0).label("total_minutes"),
            )
            .where(*base_where)
            .group_by(month_label)
            .order_by(month_label)
            .limit(24)
        ).fetchall()
        return [{"label": str(r.label), "count": r.count, "total_minutes": r.total_minutes} for r in rows]

    def _month_label_expr(self):
        dialect_name = self.db.get_bind().dialect.name if self.db.get_bind() is not None else ""
        if dialect_name == "postgresql":
            return func.to_char(LateArrival.date, "YYYY-MM")
        return func.strftime("%Y-%m", LateArrival.date)

    def top_employees(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 10,
    ) -> list[dict]:
        from app.models.employee import Employee

        base_where = [LateArrival.company_id == self.company_id]
        if date_from:
            base_where.append(LateArrival.date >= date_from)
        if date_to:
            base_where.append(LateArrival.date <= date_to)

        rows = self.db.execute(
            select(
                LateArrival.employee_id,
                Employee.first_name,
                Employee.last_name,
                func.count(LateArrival.id).label("count"),
                func.coalesce(func.sum(LateArrival.delay_minutes_total), 0).label("total_minutes"),
            )
            .join(Employee, Employee.id == LateArrival.employee_id)
            .where(*base_where)
            .group_by(LateArrival.employee_id, Employee.first_name, Employee.last_name)
            .order_by(func.count(LateArrival.id).desc())
            .limit(limit)
        ).fetchall()

        return [
            {
                "employee_id": str(r.employee_id),
                "employee_name": f"{r.first_name} {r.last_name}".strip(),
                "count": r.count,
                "total_minutes": r.total_minutes,
                "avg_minutes": round(r.total_minutes / r.count, 1) if r.count else 0.0,
            }
            for r in rows
        ]

    def list_for_export(
        self,
        *,
        employee_id: UUID | None = None,
        status: LateArrivalStatus | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[LateArrival]:
        stmt = self._base()
        stmt = self._apply_filters(
            stmt,
            employee_id=employee_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )
        stmt = stmt.options(
            selectinload(LateArrival.employee),
            selectinload(LateArrival.reviewed_by),
            selectinload(LateArrival.attendance_session),
        )
        stmt = stmt.order_by(LateArrival.date.desc()).limit(10_000)
        return list(self.db.scalars(stmt))
