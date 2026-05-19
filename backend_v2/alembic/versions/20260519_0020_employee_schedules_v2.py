"""feat: extend schedules with type, rules and flexible windows

Revision ID: 20260519_0020
Revises: 20260512_0019
Create Date: 2026-05-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260519_0020"
down_revision: str = "20260512_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create scheduletype enum
    schedule_type_enum = postgresql.ENUM(
        "none", "fixed", "weekly_custom", "flexible_window",
        name="scheduletype",
        create_type=True,
    )
    schedule_type_enum.create(op.get_bind(), checkfirst=True)

    # Add new columns to schedules
    op.add_column(
        "schedules",
        sa.Column(
            "schedule_type",
            sa.Enum("none", "fixed", "weekly_custom", "flexible_window", name="scheduletype", create_type=False),
            nullable=False,
            server_default="fixed",
        ),
    )
    op.add_column("schedules", sa.Column("grace_minutes", sa.Integer(), nullable=True))
    op.add_column("schedules", sa.Column("entry_window_start", sa.Time(), nullable=True))
    op.add_column("schedules", sa.Column("entry_window_end", sa.Time(), nullable=True))
    op.add_column("schedules", sa.Column("exit_window_start", sa.Time(), nullable=True))
    op.add_column("schedules", sa.Column("exit_window_end", sa.Time(), nullable=True))

    # Make entry_time and exit_time nullable for "none" type
    op.alter_column("schedules", "entry_time", nullable=True)
    op.alter_column("schedules", "exit_time", nullable=True)

    # Create schedule_rules table
    op.create_table(
        "schedule_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("schedule_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("weekday", sa.SmallInteger(), nullable=False),
        sa.Column("is_working_day", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("entry_window_start", sa.Time(), nullable=True),
        sa.Column("entry_window_end", sa.Time(), nullable=True),
        sa.Column("exit_window_start", sa.Time(), nullable=True),
        sa.Column("exit_window_end", sa.Time(), nullable=True),
        sa.Column("grace_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"], ondelete="CASCADE"),
        sa.CheckConstraint("weekday >= 0 AND weekday <= 6", name="schedule_rules_weekday_range"),
    )
    op.create_index("ix_schedule_rules_schedule_id", "schedule_rules", ["schedule_id"])
    op.create_index("ix_schedule_rules_company_id", "schedule_rules", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_schedule_rules_company_id", table_name="schedule_rules")
    op.drop_index("ix_schedule_rules_schedule_id", table_name="schedule_rules")
    op.drop_table("schedule_rules")

    op.drop_column("schedules", "exit_window_end")
    op.drop_column("schedules", "exit_window_start")
    op.drop_column("schedules", "entry_window_end")
    op.drop_column("schedules", "entry_window_start")
    op.drop_column("schedules", "grace_minutes")
    op.drop_column("schedules", "schedule_type")

    op.alter_column("schedules", "entry_time", nullable=False)
    op.alter_column("schedules", "exit_time", nullable=False)

    op.execute("DROP TYPE IF EXISTS scheduletype")
