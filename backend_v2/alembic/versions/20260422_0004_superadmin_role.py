"""Add superadmin role

Revision ID: 20260422_0004
Revises: 20260422_0003
Create Date: 2026-04-22
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260422_0004"
down_revision: str = "20260422_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop the old check constraint and recreate it including 'superadmin'.
    op.drop_constraint("users_role_valid", "users", type_="check")
    op.create_check_constraint(
        "users_role_valid",
        "users",
        "role IN ('superadmin', 'owner', 'admin', 'manager', 'employee')",
    )


def downgrade() -> None:
    op.drop_constraint("users_role_valid", "users", type_="check")
    op.create_check_constraint(
        "users_role_valid",
        "users",
        "role IN ('owner', 'admin', 'manager', 'employee')",
    )
