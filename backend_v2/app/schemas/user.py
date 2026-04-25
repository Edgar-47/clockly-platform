from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserRole


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    email: str = Field(max_length=255)
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=8, max_length=256)
    role: UserRole = UserRole.MANAGER

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower().strip()

    @field_validator("role")
    @classmethod
    def reject_superadmin(cls, value: UserRole) -> UserRole:
        if value == UserRole.SUPERADMIN:
            raise ValueError("SUPERADMIN cannot be assigned via this API.")
        return value


class UserRoleUpdate(BaseModel):
    role: UserRole

    @field_validator("role")
    @classmethod
    def reject_superadmin(cls, value: UserRole) -> UserRole:
        if value == UserRole.SUPERADMIN:
            raise ValueError("SUPERADMIN cannot be assigned via this API.")
        return value


class UserListResponse(BaseModel):
    items: list[UserRead]
    total: int
    limit: int
    offset: int
