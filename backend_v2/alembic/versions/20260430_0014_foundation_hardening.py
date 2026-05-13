"""foundation hardening: soft delete and geo consent logs

Revision ID: 20260430_0014
Revises: 20260430_0013
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260430_0014"
down_revision: str = "20260430_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_users_deleted_by_users",
        "users",
        "users",
        ["deleted_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_company_deleted", "users", ["company_id", "is_deleted"])

    op.add_column(
        "employees",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("employees", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("employees", sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_employees_deleted_by_users",
        "employees",
        "users",
        ["deleted_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_employees_company_deleted", "employees", ["company_id", "is_deleted"])

    op.create_table(
        "geo_consent_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("consent_type", sa.String(80), nullable=False),
        sa.Column("consent_version", sa.String(40), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(80), nullable=True),
        sa.Column("user_agent", sa.String(300), nullable=True),
        sa.Column("source", sa.String(80), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_geo_consent_logs_company_user", "geo_consent_logs", ["company_id", "user_id"])
    op.create_index("ix_geo_consent_logs_company_type", "geo_consent_logs", ["company_id", "consent_type"])
    op.create_index("ix_geo_consent_logs_user_accepted", "geo_consent_logs", ["user_id", "accepted_at"])


def downgrade() -> None:
    op.drop_table("geo_consent_logs")

    op.drop_index("ix_employees_company_deleted", table_name="employees")
    op.drop_constraint("fk_employees_deleted_by_users", "employees", type_="foreignkey")
    op.drop_column("employees", "deleted_by")
    op.drop_column("employees", "deleted_at")
    op.drop_column("employees", "is_deleted")

    op.drop_index("ix_users_company_deleted", table_name="users")
    op.drop_constraint("fk_users_deleted_by_users", "users", type_="foreignkey")
    op.drop_column("users", "deleted_by")
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "is_deleted")
