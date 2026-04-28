from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator

from app.models.enums import PlanType, UserRole
from app.schemas.employee import EmployeeRead
from app.schemas.invitation import InvitationCreateResponse, InvitationRead


class OnboardingStatusResponse(BaseModel):
    company_id: UUID
    company_name: str
    timezone: str
    plan_type: PlanType
    onboarding_step: str
    onboarding_completed_at: datetime | None
    first_employee_created_at: datetime | None
    kiosk_pin_configured_at: datetime | None
    invitations_completed_at: datetime | None
    employee_count: int
    has_kiosk_pin: bool


class OnboardingCompanyUpdate(BaseModel):
    company_name: str = Field(min_length=2, max_length=160)
    timezone: str = Field(min_length=1, max_length=80)
    plan_type: PlanType

    @field_validator("company_name", "timezone", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Unknown timezone.") from exc
        return value


class OnboardingFirstEmployeeCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=255)
    role_title: str | None = Field(default=None, max_length=100)
    pin: str | None = Field(default=None, min_length=4, max_length=4)

    @field_validator("first_name", "last_name", "email", "role_title", "pin", mode="before")
    @classmethod
    def strip_strings(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return value.lower() if value else value

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str | None) -> str | None:
        if value and not value.isdigit():
            raise ValueError("PIN must contain digits only.")
        return value


class OnboardingKioskPinUpdate(BaseModel):
    employee_id: UUID
    pin: str = Field(min_length=4, max_length=4)

    @field_validator("pin")
    @classmethod
    def validate_pin(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("PIN must contain digits only.")
        return value


class OnboardingInviteCreate(BaseModel):
    email: str = Field(max_length=255)
    role: UserRole

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

    @field_validator("role")
    @classmethod
    def reject_protected_roles(cls, value: UserRole) -> UserRole:
        if value in {UserRole.OWNER, UserRole.SUPERADMIN}:
            raise ValueError("This role cannot be invited during onboarding.")
        return value


class OnboardingFirstEmployeeResponse(BaseModel):
    employee: EmployeeRead
    status: OnboardingStatusResponse


class OnboardingInvitationResponse(BaseModel):
    invitation: InvitationCreateResponse
    status: OnboardingStatusResponse


class OnboardingInvitationsSkipResponse(BaseModel):
    status: OnboardingStatusResponse


class OnboardingCompleteResponse(BaseModel):
    status: OnboardingStatusResponse
