import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.schedule import Schedule
from app.models.schedule_rule import ScheduleRule
from app.repositories.schedule_repository import ScheduleRepository
from app.schemas.schedule import ScheduleCreate, ScheduleRead, ScheduleRuleRead, ScheduleUpdate

logger = logging.getLogger(__name__)


def _rule_to_read(rule: ScheduleRule) -> ScheduleRuleRead:
    return ScheduleRuleRead(
        id=rule.id,
        weekday=rule.weekday,
        is_working_day=rule.is_working_day,
        start_time=rule.start_time,
        end_time=rule.end_time,
        entry_window_start=rule.entry_window_start,
        entry_window_end=rule.entry_window_end,
        exit_window_start=rule.exit_window_start,
        exit_window_end=rule.exit_window_end,
        grace_minutes=rule.grace_minutes,
    )


def _to_read(schedule: Schedule, employee_count: int) -> ScheduleRead:
    return ScheduleRead(
        id=schedule.id,
        company_id=schedule.company_id,
        name=schedule.name,
        description=schedule.description,
        schedule_type=schedule.schedule_type,
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
        entry_window_start=schedule.entry_window_start,
        entry_window_end=schedule.entry_window_end,
        exit_window_start=schedule.exit_window_start,
        exit_window_end=schedule.exit_window_end,
        grace_minutes=schedule.grace_minutes,
        net_hours=schedule.net_hours,
        weekly_hours=schedule.weekly_hours,
        employee_count=employee_count,
        rules=[_rule_to_read(r) for r in schedule.rules],
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
        schedules = self.repo.find_all(include_inactive=include_inactive)
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
            schedule_type=payload.schedule_type,
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
            entry_window_start=payload.entry_window_start,
            entry_window_end=payload.entry_window_end,
            exit_window_start=payload.exit_window_start,
            exit_window_end=payload.exit_window_end,
            grace_minutes=payload.grace_minutes,
            is_active=payload.is_active,
        )
        try:
            self.repo.add(schedule)
            self._sync_rules(schedule, payload.rules)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.error("[ScheduleService] IntegrityError on create: %s", exc.orig)
            raise ConflictError("Schedule data conflicts with an existing record.") from exc
        self.db.refresh(schedule)
        logger.info("[ScheduleService] Schedule created: id=%s", schedule.id)
        return _to_read(schedule, 0)

    def update_schedule(self, schedule_id: UUID, payload: ScheduleUpdate) -> ScheduleRead:
        logger.info("[ScheduleService] Updating schedule id=%s", schedule_id)
        schedule = self.repo.get(schedule_id)
        if schedule is None:
            raise NotFoundError("Schedule not found.")

        scalar_fields = {
            "name", "description", "schedule_type", "is_active", "grace_minutes",
            "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
            "entry_time", "exit_time", "break_minutes",
            "entry_window_start", "entry_window_end", "exit_window_start", "exit_window_end",
        }
        updates = payload.model_dump(exclude_unset=True, exclude={"rules"})
        for key in scalar_fields:
            if key in updates:
                setattr(schedule, key, updates[key])

        if payload.rules is not None:
            self._sync_rules(schedule, payload.rules)

        self.db.add(schedule)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            logger.error("[ScheduleService] IntegrityError on update: %s", exc.orig)
            raise ConflictError("Schedule data conflicts with an existing record.") from exc

        self.db.refresh(schedule)
        counts = self.repo.employee_counts([schedule_id])
        return _to_read(schedule, counts.get(schedule_id, 0))

    def delete_schedule(self, schedule_id: UUID) -> None:
        schedule = self.repo.get(schedule_id)
        if schedule is None:
            raise NotFoundError("Schedule not found.")
        schedule.is_active = False
        self.db.add(schedule)
        self.db.commit()

    def _sync_rules(self, schedule: Schedule, rule_payloads: list) -> None:
        """Replace all rules for a schedule."""
        # Delete existing rules
        for existing in list(schedule.rules):
            self.db.delete(existing)
        self.db.flush()

        for rp in rule_payloads:
            rule = ScheduleRule(
                company_id=self.company_id,
                schedule_id=schedule.id,
                weekday=rp.weekday,
                is_working_day=rp.is_working_day,
                start_time=rp.start_time,
                end_time=rp.end_time,
                entry_window_start=rp.entry_window_start,
                entry_window_end=rp.entry_window_end,
                exit_window_start=rp.exit_window_start,
                exit_window_end=rp.exit_window_end,
                grace_minutes=rp.grace_minutes,
            )
            self.db.add(rule)
        self.db.flush()
