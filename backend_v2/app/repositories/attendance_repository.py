from datetime import UTC, datetime
from typing import NamedTuple
from uuid import UUID

from sqlalchemy import Select, func, literal, or_, select, union_all
from sqlalchemy.orm import Session, joinedload

from app.models.attendance_session import AttendanceSession
from app.models.employee import Employee
from app.models.enums import AttendanceStatus


class OverviewCounts(NamedTuple):
    open_sessions: int
    active_employees: int


class AttendanceRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def list_sessions(
        self,
        *,
        employee_id: UUID | None = None,
        status: AttendanceStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[AttendanceSession]:
        statement: Select[tuple[AttendanceSession]] = (
            select(AttendanceSession)
            .options(joinedload(AttendanceSession.employee))
            .where(AttendanceSession.company_id == self.company_id)
        )
        if employee_id:
            statement = statement.where(AttendanceSession.employee_id == employee_id)
        if status:
            statement = statement.where(AttendanceSession.status == status)
        if date_from:
            statement = statement.where(AttendanceSession.clock_in >= date_from)
        if date_to:
            statement = statement.where(AttendanceSession.clock_in <= date_to)
        statement = (
            statement.order_by(AttendanceSession.clock_in.desc()).offset(offset).limit(limit)
        )
        return list(self.db.scalars(statement))

    def count_sessions(
        self,
        *,
        employee_id: UUID | None = None,
        status: AttendanceStatus | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> int:
        statement = select(func.count(AttendanceSession.id)).where(
            AttendanceSession.company_id == self.company_id
        )
        if employee_id:
            statement = statement.where(AttendanceSession.employee_id == employee_id)
        if status:
            statement = statement.where(AttendanceSession.status == status)
        if date_from:
            statement = statement.where(AttendanceSession.clock_in >= date_from)
        if date_to:
            statement = statement.where(AttendanceSession.clock_in <= date_to)
        return int(self.db.scalar(statement) or 0)

    def get(self, session_id: UUID) -> AttendanceSession | None:
        return self.db.scalar(
            select(AttendanceSession)
            .options(joinedload(AttendanceSession.employee))
            .where(
                AttendanceSession.id == session_id,
                AttendanceSession.company_id == self.company_id,
            )
        )

    def get_open_for_employee(
        self,
        employee_id: UUID,
        *,
        lock: bool = False,
        exclude_session_id: UUID | None = None,
    ) -> AttendanceSession | None:
        statement = select(AttendanceSession).where(
            AttendanceSession.company_id == self.company_id,
            AttendanceSession.employee_id == employee_id,
            AttendanceSession.status == AttendanceStatus.OPEN,
        )
        if exclude_session_id is not None:
            statement = statement.where(AttendanceSession.id != exclude_session_id)
        if lock:
            statement = statement.with_for_update()
        return self.db.scalar(statement)

    def list_open_older_than(self, cutoff: datetime, *, limit: int = 500) -> list[AttendanceSession]:
        return list(
            self.db.scalars(
                select(AttendanceSession)
                .options(joinedload(AttendanceSession.employee))
                .where(
                    AttendanceSession.company_id == self.company_id,
                    AttendanceSession.status == AttendanceStatus.OPEN,
                    AttendanceSession.clock_in <= cutoff,
                )
                .order_by(AttendanceSession.clock_in.asc())
                .limit(limit)
                .with_for_update()
            )
        )

    def find_overlapping_session(
        self,
        *,
        employee_id: UUID,
        clock_in: datetime,
        clock_out: datetime | None,
        exclude_session_id: UUID | None = None,
    ) -> AttendanceSession | None:
        statement = select(AttendanceSession).where(
            AttendanceSession.company_id == self.company_id,
            AttendanceSession.employee_id == employee_id,
            AttendanceSession.status != AttendanceStatus.VOID,
            AttendanceSession.clock_in < (clock_out if clock_out is not None else datetime.max.replace(tzinfo=UTC)),
            or_(AttendanceSession.clock_out.is_(None), AttendanceSession.clock_out > clock_in),
        )
        if exclude_session_id is not None:
            statement = statement.where(AttendanceSession.id != exclude_session_id)
        return self.db.scalar(statement.limit(1))

    def add(self, session: AttendanceSession) -> AttendanceSession:
        self.db.add(session)
        self.db.flush()
        return session

    def worked_seconds_by_employee(
        self,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[tuple[UUID, str, int, int]]:
        employee_name = (
            func.coalesce(Employee.first_name, "")
            + literal(" ")
            + func.coalesce(Employee.last_name, "")
        ).label("employee_name")
        statement = (
            select(
                Employee.id,
                employee_name,
                func.coalesce(func.sum(AttendanceSession.duration_seconds), 0).label("worked_seconds"),
                func.count(AttendanceSession.id).label("closed_sessions"),
            )
            .join(AttendanceSession, AttendanceSession.employee_id == Employee.id)
            .where(
                AttendanceSession.company_id == self.company_id,
                AttendanceSession.status == AttendanceStatus.CLOSED,
            )
            .group_by(Employee.id, Employee.first_name, Employee.last_name)
            .order_by(func.coalesce(func.sum(AttendanceSession.duration_seconds), 0).desc())
        )
        if date_from:
            statement = statement.where(AttendanceSession.clock_in >= date_from)
        if date_to:
            statement = statement.where(AttendanceSession.clock_in <= date_to)
        return [(row[0], row[1], int(row[2] or 0), int(row[3] or 0)) for row in self.db.execute(statement).all()]

    def count_open_sessions(self) -> int:
        return int(
            self.db.scalar(
                select(func.count(AttendanceSession.id)).where(
                    AttendanceSession.company_id == self.company_id,
                    AttendanceSession.status == AttendanceStatus.OPEN,
                )
            )
            or 0
        )

    def sum_worked_seconds(
        self,
        *,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> int:
        statement = select(func.coalesce(func.sum(AttendanceSession.duration_seconds), 0)).where(
            AttendanceSession.company_id == self.company_id,
            AttendanceSession.status == AttendanceStatus.CLOSED,
        )
        if date_from:
            statement = statement.where(AttendanceSession.clock_in >= date_from)
        if date_to:
            statement = statement.where(AttendanceSession.clock_in <= date_to)
        return int(self.db.scalar(statement) or 0)

    def count_active_employees(self) -> int:
        return int(
            self.db.scalar(
                select(func.count(Employee.id)).where(
                    Employee.company_id == self.company_id,
                    Employee.is_active.is_(True),
                )
            )
            or 0
        )

    def get_overview_counts(self) -> OverviewCounts:
        """Return (open_sessions, active_employees) in a single round-trip.

        Uses UNION ALL so the planner can execute both aggregates in one pass.
        """
        open_q = select(
            literal("open_sessions").label("metric"),
            func.count(AttendanceSession.id).label("value"),
        ).where(
            AttendanceSession.company_id == self.company_id,
            AttendanceSession.status == AttendanceStatus.OPEN,
        )
        active_q = select(
            literal("active_employees").label("metric"),
            func.count(Employee.id).label("value"),
        ).where(
            Employee.company_id == self.company_id,
            Employee.is_active.is_(True),
        )
        rows = {row[0]: int(row[1]) for row in self.db.execute(union_all(open_q, active_q)).all()}
        return OverviewCounts(
            open_sessions=rows.get("open_sessions", 0),
            active_employees=rows.get("active_employees", 0),
        )
