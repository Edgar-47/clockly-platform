"""perf: add composite indexes for analytics, salary, and export queries

Revision ID: 20260521_0023
Revises: 20260521_0022
Create Date: 2026-05-21

Why these indexes:

1. ix_attendance_sessions_company_status_clock_in  (company_id, status, clock_in)
   - Covers the most common analytics/export query pattern:
       WHERE company_id = ? AND status = 'closed' AND clock_in >= ? AND clock_in < ?
   - Used by: _daily_totals(), worked_seconds_by_employee(), ExportService,
              count_sessions(status=CLOSED, date_from/to), anomalies long_session+auto_out.
   - Without this, PostgreSQL must choose between ix_company_clock_in and
     ix_company_status and bitmap-merge them, which is less efficient on large tables.

2. ix_attendance_sessions_company_employee_clock_in  (company_id, employee_id, clock_in)
   - Covers salary calculation and per-employee export queries:
       WHERE company_id = ? AND employee_id = ? AND status = 'closed'
       AND clock_in >= ? AND clock_in <= ?
   - Also covers find_overlapping_session and list_open_older_than per employee.
   - The existing (company_id, employee_id) index lacks clock_in, causing range
     scans on all sessions for an employee instead of the narrower date range.
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260521_0023"
down_revision: str = "20260521_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Composite index for analytics, export, and metrics queries that filter
    # on company_id + status + clock_in date range simultaneously.
    op.create_index(
        "ix_attendance_sessions_company_status_clock_in",
        "attendance_sessions",
        ["company_id", "status", "clock_in"],
    )

    # Composite index for salary-calculation and per-employee export queries
    # that need company_id + employee_id + clock_in range in one seek.
    op.create_index(
        "ix_attendance_sessions_company_employee_clock_in",
        "attendance_sessions",
        ["company_id", "employee_id", "clock_in"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_attendance_sessions_company_employee_clock_in",
        table_name="attendance_sessions",
    )
    op.drop_index(
        "ix_attendance_sessions_company_status_clock_in",
        table_name="attendance_sessions",
    )
