from __future__ import annotations

import uuid

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class CompanyUsageLog(Base):
    __tablename__ = "company_usage_logs"
    __table_args__ = (
        Index("ix_company_usage_logs_company_created", "company_id", "created_at"),
        Index("ix_company_usage_logs_feature_created", "feature_name", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    feature_name: Mapped[str] = mapped_column(String(80), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
