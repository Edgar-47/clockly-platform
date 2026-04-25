from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AttendanceMethod, AttendanceStatus


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
    created_at: datetime
    updated_at: datetime
    employee: AttendanceEmployeeRead | None = None


class AttendanceSessionListResponse(BaseModel):
    items: list[AttendanceSessionRead]
    total: int = 0
    limit: int = 100
    offset: int = 0


class ClockInRequest(BaseModel):
    employee_id: UUID | None = None
    method: AttendanceMethod = AttendanceMethod.WEB
    pin: str | None = Field(default=None, min_length=4, max_length=4)
    notes: str | None = Field(default=None, max_length=1000)

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


class ClockOutRequest(BaseModel):
    employee_id: UUID | None = None
    session_id: UUID | None = None
    method: AttendanceMethod = AttendanceMethod.WEB
    pin: str | None = Field(default=None, min_length=4, max_length=4)
    notes: str | None = Field(default=None, max_length=1000)

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


class AttendanceQuery(BaseModel):
    employee_id: UUID | None = None
    status: AttendanceStatus | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
