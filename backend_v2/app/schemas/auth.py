from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import PlanType, UserRole
from app.schemas.employee import EmployeeRead


class LoginRequest(BaseModel):
    email: str | None = Field(default=None, max_length=255)
    identifier: str | None = Field(default=None, max_length=255)
    password: str = Field(min_length=1, max_length=256)

    @field_validator("email", "identifier", "password", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @property
    def login_identifier(self) -> str:
        return (self.email or self.identifier or "").strip().lower()


class RefreshRequest(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=32, max_length=512)


class CompanyContext(BaseModel):
    id: UUID
    name: str
    slug: str
    timezone: str
    plan_type: PlanType
    plan_name: str
    max_employees: int | None
    has_exports: bool
    has_advanced_filters: bool
    has_multi_location: bool
    has_geolocation: bool
    has_admin_reports: bool
    has_support: bool
    trial_ends_at: datetime | None
    is_active_subscription: bool
    is_beta_user: bool
    stripe_subscription_status: str | None
    stripe_current_period_end: datetime | None
    stripe_cancel_at_period_end: bool
    created_by: UUID | None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead
    employee: EmployeeRead | None = None
    company: CompanyContext
    permissions: list[str]


class MeResponse(BaseModel):
    user: UserRead
    employee: EmployeeRead | None = None
    company: CompanyContext
    permissions: list[str]


class LogoutResponse(BaseModel):
    ok: bool = True


class RegisterCompanyRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=160)
    owner_email: str = Field(max_length=255)
    owner_full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8, max_length=256)
    timezone: str = Field(default="Europe/Madrid", min_length=1, max_length=80)
    plan_type: PlanType = PlanType.FREE

    @field_validator("company_name", "owner_email", "owner_full_name", "timezone", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("owner_email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.lower().strip()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")
        return email

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown timezone.") from exc
        return value


class PasswordResetRequest(BaseModel):
    email: str = Field(max_length=255)

    @field_validator("email", mode="before")
    @classmethod
    def strip_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=32, max_length=512)
    password: str = Field(min_length=8, max_length=256)


class MessageResponse(BaseModel):
    ok: bool = True
    message: str
