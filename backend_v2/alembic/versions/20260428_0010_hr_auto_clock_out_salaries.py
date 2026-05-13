"""feat: add HR role, auto clock-out incidents, and salaries

Revision ID: 20260428_0010
Revises: 20260428_0009
Create Date: 2026-04-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260428_0010"
down_revision: str = "20260428_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("users_role_valid", "users", type_="check")
    op.create_check_constraint(
        "users_role_valid",
        "users",
        "role IN ('superadmin', 'owner', 'admin', 'hr_manager', 'manager', 'employee')",
    )

    op.add_column(
        "company_settings",
        sa.Column("auto_clock_out_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("company_settings", sa.Column("auto_clock_out_time", sa.Time(), nullable=True))
    op.add_column("company_settings", sa.Column("auto_clock_out_timezone", sa.String(length=80), nullable=True))
    op.add_column(
        "company_settings",
        sa.Column("auto_clock_out_grace_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "company_settings",
        sa.Column("auto_clock_out_updated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "company_settings",
        sa.Column("auto_clock_out_updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column("attendance_sessions", sa.Column("clock_out_source", sa.String(length=16), nullable=True))
    op.add_column(
        "attendance_sessions",
        sa.Column("has_incident", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("attendance_sessions", sa.Column("incident_type", sa.String(length=40), nullable=True))
    op.add_column(
        "attendance_sessions",
        sa.Column("closed_automatically_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        """
        UPDATE attendance_sessions
        SET clock_out_source = CASE
            WHEN auto_closed = true THEN 'auto'
            WHEN is_corrected = true THEN 'manual'
            WHEN clock_out IS NOT NULL THEN 'employee'
            ELSE NULL
        END,
        has_incident = CASE WHEN auto_closed = true THEN true ELSE has_incident END,
        incident_type = CASE WHEN auto_closed = true THEN 'auto_clock_out' ELSE incident_type END,
        closed_automatically_at = CASE WHEN auto_closed = true THEN updated_at ELSE closed_automatically_at END
        """
    )

    op.create_table(
        "attendance_incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attendance_session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="open"),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("type IN ('auto_clock_out')", name="attendance_incidents_type_valid"),
        sa.CheckConstraint("status IN ('open', 'resolved')", name="attendance_incidents_status_valid"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["attendance_session_id"], ["attendance_sessions.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("company_id", "attendance_session_id", "type", name="uq_attendance_incidents_session_type"),
    )
    op.create_index("ix_attendance_incidents_company_type", "attendance_incidents", ["company_id", "type"])
    op.create_index("ix_attendance_incidents_company_status", "attendance_incidents", ["company_id", "status"])

    op.create_table(
        "salary_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("salary_type", sa.String(length=24), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="EUR"),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "salary_type IN ('hourly', 'daily', 'shift', 'monthly', 'weekly')",
            name="salary_profiles_salary_type_valid",
        ),
        sa.CheckConstraint("amount > 0", name="salary_profiles_amount_positive"),
        sa.CheckConstraint("effective_to IS NULL OR effective_to >= effective_from", name="salary_profiles_dates_valid"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_salary_profiles_company_employee", "salary_profiles", ["company_id", "employee_id"])
    op.create_index("ix_salary_profiles_company_effective", "salary_profiles", ["company_id", "effective_from", "effective_to"])

    op.create_table(
        "salary_calculations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("gross_estimated_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_hours", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_days", sa.Integer(), nullable=False),
        sa.Column("total_shifts", sa.Integer(), nullable=False),
        sa.Column("generated_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("period_end >= period_start", name="salary_calculations_dates_valid"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["generated_by_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_salary_calculations_company_employee", "salary_calculations", ["company_id", "employee_id"])
    op.create_index("ix_salary_calculations_company_period", "salary_calculations", ["company_id", "period_start", "period_end"])


def downgrade() -> None:
    op.drop_index("ix_salary_calculations_company_period", table_name="salary_calculations")
    op.drop_index("ix_salary_calculations_company_employee", table_name="salary_calculations")
    op.drop_table("salary_calculations")
    op.drop_index("ix_salary_profiles_company_effective", table_name="salary_profiles")
    op.drop_index("ix_salary_profiles_company_employee", table_name="salary_profiles")
    op.drop_table("salary_profiles")
    op.drop_index("ix_attendance_incidents_company_status", table_name="attendance_incidents")
    op.drop_index("ix_attendance_incidents_company_type", table_name="attendance_incidents")
    op.drop_table("attendance_incidents")
    op.drop_column("attendance_sessions", "closed_automatically_at")
    op.drop_column("attendance_sessions", "incident_type")
    op.drop_column("attendance_sessions", "has_incident")
    op.drop_column("attendance_sessions", "clock_out_source")
    op.drop_column("company_settings", "auto_clock_out_updated_at")
    op.drop_column("company_settings", "auto_clock_out_updated_by_user_id")
    op.drop_column("company_settings", "auto_clock_out_grace_minutes")
    op.drop_column("company_settings", "auto_clock_out_timezone")
    op.drop_column("company_settings", "auto_clock_out_time")
    op.drop_column("company_settings", "auto_clock_out_enabled")
    op.drop_constraint("users_role_valid", "users", type_="check")
    op.create_check_constraint(
        "users_role_valid",
        "users",
        "role IN ('superadmin', 'owner', 'admin', 'manager', 'employee')",
    )
