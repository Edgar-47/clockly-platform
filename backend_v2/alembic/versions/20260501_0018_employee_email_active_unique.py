"""add tenant-scoped active employee email uniqueness

Revision ID: 20260501_0018
Revises: 20260501_0017
Create Date: 2026-05-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260501_0018"
down_revision: str = "20260501_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "uq_employees_company_email_active",
        "employees",
        ["company_id", sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL AND is_deleted = false"),
    )


def downgrade() -> None:
    op.drop_index("uq_employees_company_email_active", table_name="employees")
