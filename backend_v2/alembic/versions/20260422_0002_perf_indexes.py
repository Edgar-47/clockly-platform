"""perf: add missing indexes for attendance and ticket queries

Revision ID: 20260422_0002
Revises: 20260422_0001
Create Date: 2026-04-22
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260422_0002"
down_revision: str | None = "20260422_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Speeds up list_sessions(employee_id=...) queries which filter by
    # company_id + employee_id without a status constraint.
    # The existing partial unique index only covers status='open' rows.
    op.create_index(
        "ix_attendance_sessions_company_employee_id",
        "attendance_sessions",
        ["company_id", "employee_id"],
    )

    # Speeds up list_tickets(employee_id=...) which is unindexed today.
    op.create_index(
        "ix_tickets_employee_id",
        "tickets",
        ["employee_id"],
    )

    # Speeds up audit log queries filtered by actor (admin panels, security reports).
    op.create_index(
        "ix_audit_logs_actor_user_id",
        "audit_logs",
        ["actor_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.drop_index("ix_tickets_employee_id", table_name="tickets")
    op.drop_index("ix_attendance_sessions_company_employee_id", table_name="attendance_sessions")
