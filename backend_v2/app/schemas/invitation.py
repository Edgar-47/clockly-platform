from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import InvitationStatus, UserRole


class InvitationCreate(BaseModel):
    email: str = Field(max_length=255)
    role: UserRole

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()

    @field_validator("role")
    @classmethod
    def reject_protected_roles(cls, value: UserRole) -> UserRole:
        if value in {UserRole.OWNER, UserRole.SUPERADMIN}:
            raise ValueError("This role cannot be invited from tenant member management.")
        return value


class InvitationAccept(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("full_name", mode="before")
    @classmethod
    def strip_full_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    email: str
    role: UserRole
    invited_by_user_id: UUID
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None


class InvitationCreateResponse(InvitationRead):
    acceptance_url: str


class InvitationListResponse(BaseModel):
    items: list[InvitationRead]


class InvitationAcceptResponse(BaseModel):
    ok: bool = True
    invitation: InvitationRead
