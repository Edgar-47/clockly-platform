from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GeoConsentCreate(BaseModel):
    consent_type: str = Field(default="geolocation_attendance", min_length=1, max_length=80)
    consent_version: str = Field(min_length=1, max_length=40)
    source: str = Field(default="web", min_length=1, max_length=80)
    metadata: dict[str, Any] | None = None


class GeoConsentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    user_id: UUID
    consent_type: str
    consent_version: str
    accepted_at: datetime
    revoked_at: datetime | None
    ip_address: str | None
    user_agent: str | None
    source: str
    metadata_json: dict[str, Any] | None = Field(default=None, serialization_alias="metadata")
    created_at: datetime
    updated_at: datetime


class GeoConsentListResponse(BaseModel):
    items: list[GeoConsentRead]
    total: int
