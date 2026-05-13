import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.schedule import Schedule
from app.repositories.schedule_repository import ScheduleRepository
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleUpdate

logger = logging.getLogger(__name__)


def _to_read(schedule: Schedule, employee_count: int) -> ScheduleRead:
    return ScheduleRead(
        id=schedule.id,
        company_id=schedule.company_id,
        name=schedule.name,
        description=schedule.description,
        monday=schedule.monday,
        tuesday=schedule.tuesday,
        wednesday=schedule.wednesday,
        thursday=schedule.thursday,
        friday=schedule.friday,
        saturday=schedule.saturday,
        sunday=schedule.sunday,
        entry_time=schedule.entry_time,
        exit_time=schedule.exit_time,
        break_minutes=schedule.break_minutes,
        net_hours=schedule.net_hours,
        weekly_hours=schedule.weekly_hours,
        employee_count=employee_count,
        is_active=schedule.is_active,
        created_at=schedule.created_at,
        updated_at=schedule.updated_at,
    )


class ScheduleService:
    def __init__(self, db: Session, *, company_id: UUID) -> None:
        self.db = db
        self.company_id = company_id
        self.repo = ScheduleRepository(db, company_id=company_id)

    def list_schedules(self, *, include_inactive: bool = False) -> tuple[list[ScheduleRead], int]:
        schedules = self.repo.list(include_inactive=include_inactive)
        total = self.repo.count(include_inactive=include_inactive)
        ids = [s.id for s in schedules]
        counts = self.repo.employee_counts(ids)
        items = [_to_read(s, counts.get(s.id, 0)) for s in schedules]
        return items, total

    def get_schedule(self, schedule_id: UUID) -> ScheduleRead:
        schedule = self.repo.get(schedule_id)
        if schedule is None:
            raise NotFoundError("Schedule not found.")
        counts = self.repo.employee_counts([schedule_id])
        return _to_read(schedule, counts.get(schedule_id, 0))

    def create_schedule(self, payload: ScheduleCreate) -> ScheduleRead:
        logger.info("[ScheduleService] Creating schedule '%s' (company=%s)", payload.name, self.company_id)
        schedule = Schedule(
            company_id=self.company_id,
            name=payload.name,
            description=payload.description,
            monday=payload.monday,
            tuesday=payload.tuesday,
            wednesday=payload.wednesday,
            thursday=payload.thursday,
            friday=payload.friday,
            saturday=payload.saturday,
            sunday=payload.sunday,
            entry_time=payload.entry_time,
            exit_time=payload.exit_time,
            break_minutes=payload.break_minutes,
            is_active=payload.is_active,
        )
        try:
            self.repo.add(schedule)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.error("[ScheduleService] IntegrityError on create: %s", exc.orig)
            raise ConflictError("Schedule data conflicts with an existing record.") from exc
        logger.info("[ScheduleService] Schedule created: id=%s", schedule.id)
        return _to_read(schedule, 0)

    def update_schedule(self, schedule_id: UUID, payload: ScheduleUpdate) -> ScheduleRead:
        logger.info("[ScheduleService] Updating schedule id=%s", schedule_id)
        schedule = self.repo.get(schedule_id)
        if schedule is None:
            raise NotFoundError("Schedule not found.")
        updates = payload.model_dump(exclude_unset=True)
        for key, value in updates.items():
            setattr(schedule, key, value)
        self.db.add(schedule)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.error("[ScheduleService] IntegrityError on update: %s", exc.orig)
            raise ConflictError("Schedule data conflicts with an existing record.") from exc
        counts = self.repo.employee_counts([schedule_id])
        return _to_read(schedule, counts.get(schedule_id, 0))
