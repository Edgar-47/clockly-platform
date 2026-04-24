from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    address: str | None = Field(default=None, max_length=255)
    timezone: str = Field(default="Europe/Madrid", max_length=80)
    is_active: bool = True

    @field_validator("name", "address", "timezone", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    name: str
    address: str | None
    timezone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LocationListResponse(BaseModel):
    items: list[LocationRead]
