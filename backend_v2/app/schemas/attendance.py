from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import (
    AttendanceMethod,
    AttendanceStatus,
    LocationPermissionStatus,
    LocationSource,
    LocationStatus,
)


class AttendanceEmployeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    full_name: str
    role_title: str | None


class AttendanceSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    employee_id: UUID
    user_id: UUID | None
    clock_in: datetime
    clock_out: datetime | None
    duration_seconds: int | None
    status: AttendanceStatus
    method: AttendanceMethod
    notes: str | None
    company_timezone: str | None = None
    is_corrected: bool = False
    corrected_at: datetime | None = None
    corrected_by_user_id: UUID | None = None
    auto_closed: bool = False
    created_at: datetime
    updated_at: datetime
    employee: AttendanceEmployeeRead | None = None

    # Geolocation — clock-in
    clock_in_latitude: float | None = None
    clock_in_longitude: float | None = None
    clock_in_accuracy_meters: float | None = None
    clock_in_location_status: LocationStatus | None = None
    clock_in_distance_meters: float | None = None

    # Geolocation — clock-out
    clock_out_latitude: float | None = None
    clock_out_longitude: float | None = None
    clock_out_accuracy_meters: float | None = None
    clock_out_location_status: LocationStatus | None = None
    clock_out_distance_meters: float | None = None

    # Meta
    location_source: LocationSource = LocationSource.UNKNOWN
    location_permission_status: LocationPermissionStatus = LocationPermissionStatus.UNKNOWN


class AttendanceSessionListResponse(BaseModel):
    items: list[AttendanceSessionRead]
    total: int = 0
    limit: int = 100
    offset: int = 0


class GeoPayload(BaseModel):
    """Optional location data sent with clock-in / clock-out requests."""

    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    accuracy_meters: float | None = Field(default=None, ge=0.0)
    location_source: LocationSource = LocationSource.UNKNOWN
    location_permission_status: LocationPermissionStatus = LocationPermissionStatus.UNKNOWN


class ClockInRequest(BaseModel):
    employee_id: UUID | None = None
    method: AttendanceMethod = AttendanceMethod.WEB
    pin: str | None = Field(default=None, min_length=4, max_length=4)
    notes: str | None = Field(default=None, max_length=1000)

    # Location fields — all optional; backend never blocks clock-in on missing location
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    accuracy_meters: float | None = Field(default=None, ge=0.0)
    location_source: LocationSource = LocationSource.UNKNOWN
    location_permission_status: LocationPermissionStatus = LocationPermissionStatus.UNKNOWN
    auto_close_open_session: bool = False

    @field_validator("pin", mode="before")
    @classmethod
    def normalize_pin(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str | None) -> str | None:
        if value and not value.isdigit():
            raise ValueError("PIN must contain digits only.")
        return value

    def geo(self) -> GeoPayload:
        return GeoPayload(
            latitude=self.latitude,
            longitude=self.longitude,
            accuracy_meters=self.accuracy_meters,
            location_source=self.location_source,
            location_permission_status=self.location_permission_status,
        )


class ClockOutRequest(BaseModel):
    employee_id: UUID | None = None
    session_id: UUID | None = None
    method: AttendanceMethod = AttendanceMethod.WEB
    pin: str | None = Field(default=None, min_length=4, max_length=4)
    notes: str | None = Field(default=None, max_length=1000)

    # Location fields
    latitude: float | None = Field(default=None, ge=-90.0, le=90.0)
    longitude: float | None = Field(default=None, ge=-180.0, le=180.0)
    accuracy_meters: float | None = Field(default=None, ge=0.0)
    location_source: LocationSource = LocationSource.UNKNOWN
    location_permission_status: LocationPermissionStatus = LocationPermissionStatus.UNKNOWN

    @field_validator("pin", mode="before")
    @classmethod
    def normalize_pin(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str | None) -> str | None:
        if value and not value.isdigit():
            raise ValueError("PIN must contain digits only.")
        return value

    def geo(self) -> GeoPayload:
        return GeoPayload(
            latitude=self.latitude,
            longitude=self.longitude,
            accuracy_meters=self.accuracy_meters,
            location_source=self.location_source,
            location_permission_status=self.location_permission_status,
        )


class AttendanceQuery(BaseModel):
    employee_id: UUID | None = None
    status: AttendanceStatus | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class AttendanceSessionAdminUpdate(BaseModel):
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)
    mark_corrected: bool = True


class AutoCloseOpenSessionsRequest(BaseModel):
    older_than_hours: int | None = Field(default=None, ge=1, le=72)
    close_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)


class AutoCloseOpenSessionsResponse(BaseModel):
    closed_count: int
    items: list[AttendanceSessionRead]
