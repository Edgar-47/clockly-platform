from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.schedule import Schedule


class ScheduleRepository:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id

    def list(self, *, include_inactive: bool = False) -> list[Schedule]:
        stmt = select(Schedule).where(Schedule.company_id == self.company_id)
        if not include_inactive:
            stmt = stmt.where(Schedule.is_active.is_(True))
        stmt = stmt.order_by(Schedule.name)
        return list(self.db.scalars(stmt))

    def count(self, *, include_inactive: bool = False) -> int:
        stmt = select(func.count(Schedule.id)).where(Schedule.company_id == self.company_id)
        if not include_inactive:
            stmt = stmt.where(Schedule.is_active.is_(True))
        return int(self.db.scalar(stmt) or 0)

    def get(self, schedule_id: UUID) -> Schedule | None:
        return self.db.scalar(
            select(Schedule).where(
                Schedule.id == schedule_id,
                Schedule.company_id == self.company_id,
            )
        )

    def employee_counts(self, schedule_ids: list[UUID]) -> dict[UUID, int]:
        """Return {schedule_id: employee_count} for a list of schedule IDs."""
        if not schedule_ids:
            return {}
        rows = self.db.execute(
            select(Employee.schedule_id, func.count(Employee.id))
            .where(Employee.schedule_id.in_(schedule_ids))
            .where(Employee.is_active.is_(True))
            .group_by(Employee.schedule_id)
        ).all()
        return {row[0]: row[1] for row in rows}

    def add(self, schedule: Schedule) -> Schedule:
        self.db.add(schedule)
        self.db.flush()
        return schedule
