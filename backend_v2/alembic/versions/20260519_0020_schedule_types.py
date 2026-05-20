"""Add schedule_type, entry_window_end, exit_window_start to schedules

Revision ID: 20260519_0020
Revises: 20260512_0019
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

revision = "20260519_0020"
down_revision = "20260512_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "schedules",
        sa.Column("schedule_type", sa.String(20), nullable=False, server_default="fixed"),
    )
    op.add_column(
        "schedules",
        sa.Column("entry_window_end", sa.Time(), nullable=True),
    )
    op.add_column(
        "schedules",
        sa.Column("exit_window_start", sa.Time(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("schedules", "exit_window_start")
    op.drop_column("schedules", "entry_window_end")
    op.drop_column("schedules", "schedule_type")
