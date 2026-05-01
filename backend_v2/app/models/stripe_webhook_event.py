from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class StripeWebhookEvent(TimestampMixin, Base):
    __tablename__ = "stripe_webhook_events"
    __table_args__ = (
        Index("ix_stripe_webhook_events_object_created", "object_id", "stripe_created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stripe_event_id: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    object_id: Mapped[str | None] = mapped_column(String(120))
    stripe_created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24), default="processing", nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)
