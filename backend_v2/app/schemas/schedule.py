from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import ScheduleType


# ── Schedule Rule ──────────────────────────────────────────────────────────────

class ScheduleRuleCreate(BaseModel):
    weekday: int = Field(ge=0, le=6)
    is_working_day: bool = True
    start_time: time | None = None
    end_time: time | None = None
    entry_window_start: time | None = None
    entry_window_end: time | None = None
    exit_window_start: time | None = None
    exit_window_end: time | None = None
    grace_minutes: int | None = Field(default=None, ge=0, le=120)

    @model_validator(mode="after")
    def validate_times(self) -> "ScheduleRuleCreate":
        if self.is_working_day:
            if self.start_time and self.end_time:
                s = self.start_time.hour * 60 + self.start_time.minute
                e = self.end_time.hour * 60 + self.end_time.minute
                if e <= s:
                    raise ValueError("end_time must be after start_time.")
            if self.entry_window_start and self.entry_window_end:
                s = self.entry_window_start.hour * 60 + self.entry_window_start.minute
                e = self.entry_window_end.hour * 60 + self.entry_window_end.minute
                if e <= s:
                    raise ValueError("entry_window_end must be after entry_window_start.")
            if self.exit_window_start and self.exit_window_end:
                s = self.exit_window_start.hour * 60 + self.exit_window_start.minute
                e = self.exit_window_end.hour * 60 + self.exit_window_end.minute
                if e <= s:
                    raise ValueError("exit_window_end must be after exit_window_start.")
        return self


class ScheduleRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    weekday: int
    is_working_day: bool
    start_time: time | None
    end_time: time | None
    entry_window_start: time | None
    entry_window_end: time | None
    exit_window_start: time | None
    exit_window_end: time | None
    grace_minutes: int | None


# ── Schedule ──────────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    schedule_type: ScheduleType = ScheduleType.FIXED
    is_active: bool = True
    grace_minutes: int | None = Field(default=None, ge=0, le=120)

    # Used by FIXED type
    monday: bool = False
    tuesday: bool = False
    wednesday: bool = False
    thursday: bool = False
    friday: bool = False
    saturday: bool = False
    sunday: bool = False
    entry_time: time | None = None
    exit_time: time | None = None
    break_minutes: int = Field(default=0, ge=0, le=480)

    # Used by FLEXIBLE_WINDOW type (schedule-level windows)
    entry_window_start: time | None = None
    entry_window_end: time | None = None
    exit_window_start: time | None = None
    exit_window_end: time | None = None

    # Used by WEEKLY_CUSTOM and FLEXIBLE_WINDOW (per-day rules)
    rules: list[ScheduleRuleCreate] = Field(default_factory=list)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def validate_by_type(self) -> "ScheduleCreate":
        t = self.schedule_type

        if t == ScheduleType.NONE:
            return self

        if t == ScheduleType.FIXED:
            days = [self.monday, self.tuesday, self.wednesday, self.thursday,
                    self.friday, self.saturday, self.sunday]
            if not any(days):
                raise ValueError("At least one working day must be selected for fixed schedule.")
            if self.entry_time is None:
                raise ValueError("entry_time is required for fixed schedule.")
            if self.exit_time is None:
                raise ValueError("exit_time is required for fixed schedule.")
            entry_mins = self.entry_time.hour * 60 + self.entry_time.minute
            exit_mins = self.exit_time.hour * 60 + self.exit_time.minute
            if exit_mins <= entry_mins:
                raise ValueError("exit_time must be after entry_time.")
            if (exit_mins - entry_mins) <= self.break_minutes:
                raise ValueError("break_minutes cannot exceed the total shift duration.")

        if t == ScheduleType.WEEKLY_CUSTOM:
            if not self.rules:
                raise ValueError("weekly_custom schedule requires at least one rule.")
            working = [r for r in self.rules if r.is_working_day]
            if not working:
                raise ValueError("At least one working day must be defined.")
            for r in working:
                if r.start_time is None or r.end_time is None:
                    raise ValueError("start_time and end_time are required for each working day.")

        if t == ScheduleType.FLEXIBLE_WINDOW:
            # Accept either schedule-level windows or per-day rules
            has_schedule_windows = self.entry_window_start and self.entry_window_end
            has_rules = bool(self.rules)
            if not has_schedule_windows and not has_rules:
                raise ValueError(
                    "flexible_window schedule requires entry_window_start/end or per-day rules."
                )
            if has_schedule_windows:
                s = self.entry_window_start.hour * 60 + self.entry_window_start.minute  # type: ignore[union-attr]
                e = self.entry_window_end.hour * 60 + self.entry_window_end.minute  # type: ignore[union-attr]
                if e <= s:
                    raise ValueError("entry_window_end must be after entry_window_start.")
            if self.exit_window_start and self.exit_window_end:
                s = self.exit_window_start.hour * 60 + self.exit_window_start.minute
                e = self.exit_window_end.hour * 60 + self.exit_window_end.minute
                if e <= s:
                    raise ValueError("exit_window_end must be after exit_window_start.")

        return self


class ScheduleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    schedule_type: ScheduleType | None = None
    is_active: bool | None = None
    grace_minutes: int | None = Field(default=None, ge=0, le=120)

    # FIXED fields
    monday: bool | None = None
    tuesday: bool | None = None
    wednesday: bool | None = None
    thursday: bool | None = None
    friday: bool | None = None
    saturday: bool | None = None
    sunday: bool | None = None
    entry_time: time | None = None
    exit_time: time | None = None
    break_minutes: int | None = Field(default=None, ge=0, le=480)

    # FLEXIBLE_WINDOW fields
    entry_window_start: time | None = None
    entry_window_end: time | None = None
    exit_window_start: time | None = None
    exit_window_end: time | None = None

    # Replaces rules entirely when provided
    rules: list[ScheduleRuleCreate] | None = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class ScheduleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    name: str
    description: str | None
    schedule_type: ScheduleType
    monday: bool
    tuesday: bool
    wednesday: bool
    thursday: bool
    friday: bool
    saturday: bool
    sunday: bool
    entry_time: time | None
    exit_time: time | None
    break_minutes: int
    entry_window_start: time | None
    entry_window_end: time | None
    exit_window_start: time | None
    exit_window_end: time | None
    grace_minutes: int | None
    net_hours: float
    weekly_hours: float
    employee_count: int
    rules: list[ScheduleRuleRead]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ScheduleListResponse(BaseModel):
    items: list[ScheduleRead]
    total: int


class EmployeeScheduleAssign(BaseModel):
    schedule_id: UUID | None = None
