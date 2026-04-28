from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.enums import SalaryType


class SalaryProfileCreate(BaseModel):
    employee_id: UUID
    salary_type: SalaryType
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    effective_from: date
    effective_to: date | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator("notes", mode="before")
    @classmethod
    def strip_notes(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def validate_dates(self) -> "SalaryProfileCreate":
        if self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to cannot be earlier than effective_from.")
        return self


class SalaryProfileUpdate(BaseModel):
    effective_to: date | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("notes", mode="before")
    @classmethod
    def strip_notes(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class SalaryProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    employee_id: UUID
    salary_type: SalaryType
    amount: Decimal
    currency: str
    effective_from: date
    effective_to: date | None
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
    notes: str | None


class SalaryProfileListResponse(BaseModel):
    items: list[SalaryProfileRead]


class SalaryCalculationLine(BaseModel):
    salary_profile_id: UUID
    salary_type: SalaryType
    amount: Decimal
    currency: str
    period_start: date
    period_end: date
    total_hours: Decimal
    total_days: int
    total_shifts: int
    incident_count: int
    gross_estimated_amount: Decimal


class SalaryCalculationRead(BaseModel):
    employee_id: UUID
    period_start: date
    period_end: date
    currency: str
    gross_estimated_amount: Decimal
    total_hours: Decimal
    total_days: int
    total_shifts: int
    incident_count: int
    open_sessions_ignored: int
    lines: list[SalaryCalculationLine]
    warning: str


class SalaryCalculationGenerateRequest(BaseModel):
    employee_id: UUID
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def validate_dates(self) -> "SalaryCalculationGenerateRequest":
        if self.period_end < self.period_start:
            raise ValueError("period_end cannot be earlier than period_start.")
        return self


class SalaryCalculationStoredRead(SalaryCalculationRead):
    id: UUID
    generated_by_user_id: UUID | None
    generated_at: datetime
