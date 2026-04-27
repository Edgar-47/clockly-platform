from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    address: str | None = Field(default=None, max_length=255)
    timezone: str = Field(default="Europe/Madrid", max_length=80)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    allowed_radius_meters: int = Field(default=100, ge=10, le=50_000)
    is_active: bool = True

    @field_validator("name", "address", "timezone", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def coords_both_or_neither(self) -> "LocationCreate":
        has_lat = self.latitude is not None
        has_lon = self.longitude is not None
        if has_lat != has_lon:
            raise ValueError("Both latitude and longitude must be provided together.")
        return self


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    address: str | None = Field(default=None, max_length=255)
    timezone: str | None = Field(default=None, max_length=80)
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    allowed_radius_meters: int | None = Field(default=None, ge=10, le=50_000)
    is_active: bool | None = None

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
    latitude: float | None
    longitude: float | None
    allowed_radius_meters: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class LocationListResponse(BaseModel):
    items: list[LocationRead]
