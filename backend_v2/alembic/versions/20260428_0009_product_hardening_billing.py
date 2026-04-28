"""feat: harden attendance and add billing fields

Revision ID: 20260428_0009
Revises: 20260428_0008
Create Date: 2026-04-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260428_0009"
down_revision: str = "20260428_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("has_geolocation", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.execute("UPDATE companies SET has_geolocation = true WHERE plan_type IN ('pro', 'business')")
    op.add_column(
        "companies",
        sa.Column("is_beta_user", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("companies", sa.Column("stripe_customer_id", sa.String(length=120), nullable=True))
    op.add_column("companies", sa.Column("stripe_subscription_id", sa.String(length=120), nullable=True))
    op.add_column("companies", sa.Column("stripe_subscription_status", sa.String(length=80), nullable=True))
    op.create_index("ix_companies_stripe_customer_id", "companies", ["stripe_customer_id"], unique=True)
    op.create_index("ix_companies_stripe_subscription_id", "companies", ["stripe_subscription_id"], unique=True)

    op.add_column(
        "company_settings",
        sa.Column("auto_close_open_sessions", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "company_settings",
        sa.Column("auto_close_after_hours", sa.Integer(), nullable=False, server_default="16"),
    )

    op.add_column(
        "attendance_sessions",
        sa.Column("corrected_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("attendance_sessions", sa.Column("corrected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "attendance_sessions",
        sa.Column("is_corrected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "attendance_sessions",
        sa.Column("auto_closed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_foreign_key(
        "fk_attendance_sessions_corrected_by_user_id_users",
        "attendance_sessions",
        "users",
        ["corrected_by_user_id"],
        ["id"],
    )

    op.execute(
        """
        UPDATE attendance_sessions
        SET status = 'closed'
        WHERE clock_out IS NOT NULL AND status = 'open'
        """
    )
    op.execute(
        """
        UPDATE attendance_sessions
        SET duration_seconds = GREATEST(EXTRACT(EPOCH FROM (clock_out - clock_in))::integer, 0)
        WHERE clock_out IS NOT NULL AND duration_seconds IS NULL
        """
    )
    op.execute(
        """
        UPDATE attendance_sessions
        SET clock_out = NULL, duration_seconds = NULL
        WHERE status = 'open'
        """
    )
    op.create_check_constraint(
        "attendance_sessions_status_timestamp_consistency",
        "attendance_sessions",
        """
        (
            (status = 'open' AND clock_out IS NULL AND duration_seconds IS NULL)
            OR (status = 'closed' AND clock_out IS NOT NULL AND duration_seconds IS NOT NULL)
            OR status = 'void'
        )
        """,
    )


def downgrade() -> None:
    op.drop_constraint("attendance_sessions_status_timestamp_consistency", "attendance_sessions", type_="check")
    op.drop_constraint("fk_attendance_sessions_corrected_by_user_id_users", "attendance_sessions", type_="foreignkey")
    op.drop_column("attendance_sessions", "auto_closed")
    op.drop_column("attendance_sessions", "is_corrected")
    op.drop_column("attendance_sessions", "corrected_at")
    op.drop_column("attendance_sessions", "corrected_by_user_id")
    op.drop_column("company_settings", "auto_close_after_hours")
    op.drop_column("company_settings", "auto_close_open_sessions")
    op.drop_index("ix_companies_stripe_subscription_id", table_name="companies")
    op.drop_index("ix_companies_stripe_customer_id", table_name="companies")
    op.drop_column("companies", "stripe_subscription_status")
    op.drop_column("companies", "stripe_subscription_id")
    op.drop_column("companies", "stripe_customer_id")
    op.drop_column("companies", "is_beta_user")
    op.drop_column("companies", "has_geolocation")
