"""add Stripe webhook idempotency and subscription period fields

Revision ID: 20260501_0017
Revises: 20260430_0016
Create Date: 2026-05-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260501_0017"
down_revision: str = "20260430_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("stripe_current_period_end", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "companies",
        sa.Column("stripe_cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stripe_event_id", sa.String(length=120), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("object_id", sa.String(length=120), nullable=True),
        sa.Column("stripe_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_stripe_webhook_events_stripe_event_id",
        "stripe_webhook_events",
        ["stripe_event_id"],
        unique=True,
    )
    op.create_index(
        "ix_stripe_webhook_events_object_created",
        "stripe_webhook_events",
        ["object_id", "stripe_created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_stripe_webhook_events_object_created", table_name="stripe_webhook_events")
    op.drop_index("ix_stripe_webhook_events_stripe_event_id", table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
    op.drop_column("companies", "stripe_cancel_at_period_end")
    op.drop_column("companies", "stripe_current_period_end")
