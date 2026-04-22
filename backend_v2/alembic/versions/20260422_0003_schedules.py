"""feat: add schedules table and employee schedule assignment

Revision ID: 20260422_0003
Revises: 20260422_0002
Create Date: 2026-04-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260422_0003"
down_revision: str | None = "20260422_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("monday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("tuesday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("wednesday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("thursday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("friday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("saturday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sunday", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("entry_time", sa.Time(), nullable=False),
        sa.Column("exit_time", sa.Time(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("break_minutes >= 0", name="schedules_break_minutes_non_negative"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_schedules_company_id", "schedules", ["company_id"])
    op.create_index("ix_schedules_company_active", "schedules", ["company_id", "is_active"])

    op.add_column(
        "employees",
        sa.Column("schedule_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_employees_schedule_id_schedules",
        "employees",
        "schedules",
        ["schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_employees_schedule_id", "employees", ["schedule_id"])


def downgrade() -> None:
    op.drop_index("ix_employees_schedule_id", table_name="employees")
    op.drop_constraint("fk_employees_schedule_id_schedules", "employees", type_="foreignkey")
    op.drop_column("employees", "schedule_id")
    op.drop_index("ix_schedules_company_active", table_name="schedules")
    op.drop_index("ix_schedules_company_id", table_name="schedules")
    op.drop_table("schedules")
