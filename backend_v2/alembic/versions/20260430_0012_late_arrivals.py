"""feat: add late arrivals module

Revision ID: 20260430_0012
Revises: 20260429_0011
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260430_0012"
down_revision: str = "20260429_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── company_settings: add late-arrival configuration columns ─────────────
    op.add_column(
        "company_settings",
        sa.Column("late_arrivals_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "company_settings",
        sa.Column("late_arrival_grace_minutes", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )

    # ── late_arrivals table ───────────────────────────────────────────────────
    op.create_table(
        "late_arrivals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "employee_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employees.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "attendance_session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attendance_sessions.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "schedule_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("schedules.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("scheduled_start_time", sa.Time(), nullable=False),
        sa.Column("actual_clock_in_time", sa.Time(), nullable=False),
        sa.Column("delay_minutes_total", sa.Integer(), nullable=False),
        sa.Column("delay_minutes_after_grace", sa.Integer(), nullable=False),
        sa.Column("grace_period_minutes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("clock_in_method", sa.String(16), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("justification_text", sa.Text(), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column(
            "reviewed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_session_corrected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_late_arrivals_company_date", "late_arrivals", ["company_id", "date"])
    op.create_index("ix_late_arrivals_company_employee", "late_arrivals", ["company_id", "employee_id"])
    op.create_index("ix_late_arrivals_company_status", "late_arrivals", ["company_id", "status"])


def downgrade() -> None:
    op.drop_table("late_arrivals")
    op.drop_column("company_settings", "late_arrival_grace_minutes")
    op.drop_column("company_settings", "late_arrivals_enabled")
