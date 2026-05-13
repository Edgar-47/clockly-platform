from datetime import datetime, time
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AutoClockOutSettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: UUID
    auto_clock_out_enabled: bool
    auto_clock_out_time: time | None
    auto_clock_out_timezone: str | None
    auto_clock_out_grace_minutes: int
    auto_clock_out_updated_by_user_id: UUID | None
    auto_clock_out_updated_at: datetime | None
    updated_at: datetime


class AutoClockOutSettingsUpdate(BaseModel):
    auto_clock_out_enabled: bool
    auto_clock_out_time: time | None = None
    auto_clock_out_timezone: str | None = Field(default=None, min_length=1, max_length=80)
    auto_clock_out_grace_minutes: int = Field(default=0, ge=0, le=180)

    @field_validator("auto_clock_out_timezone", mode="before")
    @classmethod
    def strip_timezone(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("auto_clock_out_timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown timezone.") from exc
        return value

    @model_validator(mode="after")
    def enabled_requires_time(self) -> "AutoClockOutSettingsUpdate":
        if self.auto_clock_out_enabled and self.auto_clock_out_time is None:
            raise ValueError("auto_clock_out_time is required when auto clock-out is enabled.")
        return self
