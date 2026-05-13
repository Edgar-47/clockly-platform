from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ScheduleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    monday: bool = False
    tuesday: bool = False
    wednesday: bool = False
    thursday: bool = False
    friday: bool = False
    saturday: bool = False
    sunday: bool = False
    entry_time: time
    exit_time: time
    break_minutes: int = Field(default=0, ge=0, le=480)
    is_active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def exit_after_entry(self) -> "ScheduleCreate":
        entry_mins = self.entry_time.hour * 60 + self.entry_time.minute
        exit_mins = self.exit_time.hour * 60 + self.exit_time.minute
        if exit_mins <= entry_mins:
            raise ValueError("exit_time must be after entry_time.")
        if (exit_mins - entry_mins) <= self.break_minutes:
            raise ValueError("break_minutes cannot exceed the total shift duration.")
        return self

    @model_validator(mode="after")
    def at_least_one_day(self) -> "ScheduleCreate":
        days = [self.monday, self.tuesday, self.wednesday, self.thursday, self.friday, self.saturday, self.sunday]
        if not any(days):
            raise ValueError("At least one working day must be selected.")
        return self


class ScheduleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
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
    is_active: bool | None = None

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
    monday: bool
    tuesday: bool
    wednesday: bool
    thursday: bool
    friday: bool
    saturday: bool
    sunday: bool
    entry_time: time
    exit_time: time
    break_minutes: int
    net_hours: float
    weekly_hours: float
    employee_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ScheduleListResponse(BaseModel):
    items: list[ScheduleRead]
    total: int


class EmployeeScheduleAssign(BaseModel):
    schedule_id: UUID | None = None
