from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.board import BOARD_LABEL_COLORS
from app.models.enums import BoardNotePriority, BoardNoteStatus


class UserSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str


class BoardLabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = Field(min_length=1, max_length=24)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("name is required")
        return cleaned

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        color = value.strip().lower()
        if color not in BOARD_LABEL_COLORS:
            raise ValueError("Unsupported label color.")
        return color

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str | None) -> str | None:
        cleaned = value.strip() if value else None
        return cleaned or None


class BoardLabelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, min_length=1, max_length=24)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("name is required")
        return cleaned

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return None
        color = value.strip().lower()
        if color not in BOARD_LABEL_COLORS:
            raise ValueError("Unsupported label color.")
        return color

    @field_validator("description")
    @classmethod
    def clean_description(cls, value: str | None) -> str | None:
        cleaned = value.strip() if value else None
        return cleaned or None


class BoardLabelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    name: str
    color: str
    description: str | None
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime


class BoardNoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    content: str | None = Field(default=None, max_length=5000)
    status: BoardNoteStatus = BoardNoteStatus.PENDING
    priority: BoardNotePriority = BoardNotePriority.MEDIUM
    label_ids: list[UUID] = Field(default_factory=list, max_length=12)
    reminder_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("title is required")
        return cleaned

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str | None) -> str | None:
        cleaned = value.strip() if value else None
        return cleaned or None


class BoardNoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    content: str | None = Field(default=None, max_length=5000)
    status: BoardNoteStatus | None = None
    priority: BoardNotePriority | None = None
    label_ids: list[UUID] | None = Field(default=None, max_length=12)
    reminder_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise ValueError("title is required")
        return cleaned

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str | None) -> str | None:
        cleaned = value.strip() if value else None
        return cleaned or None


class BoardNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    title: str
    content: str | None
    status: BoardNoteStatus
    priority: BoardNotePriority
    reminder_at: datetime | None
    completed_at: datetime | None
    archived_at: datetime | None
    created_by_user_id: UUID | None
    created_at: datetime
    updated_at: datetime
    author: UserSnapshot | None = None
    labels: list[BoardLabelRead] = Field(default_factory=list)


class BoardNoteListResponse(BaseModel):
    items: list[BoardNoteRead]
    total: int
    limit: int
    offset: int


class BoardLabelListResponse(BaseModel):
    items: list[BoardLabelRead]
    total: int
