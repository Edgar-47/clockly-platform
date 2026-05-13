"""feat: add company subscription plans

Revision ID: 20260422_0005
Revises: 20260422_0004
Create Date: 2026-04-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260422_0005"
down_revision: str = "20260422_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("plan_type", sa.String(length=32), nullable=False, server_default="free"),
    )
    op.add_column(
        "companies",
        sa.Column("max_employees", sa.Integer(), nullable=True, server_default="5"),
    )
    op.add_column(
        "companies",
        sa.Column("has_exports", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "companies",
        sa.Column("has_advanced_filters", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "companies",
        sa.Column("has_multi_location", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "companies",
        sa.Column("has_admin_reports", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "companies",
        sa.Column("has_support", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "companies",
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("is_active_subscription", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "companies",
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_check_constraint(
        "companies_plan_type_valid",
        "companies",
        "plan_type IN ('free', 'pro', 'business')",
    )
    op.create_foreign_key(
        "fk_companies_created_by_users",
        "companies",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_companies_created_by", "companies", ["created_by"])
    op.execute(
        """
        UPDATE companies
        SET created_by = owner.id
        FROM (
            SELECT DISTINCT ON (company_id) id, company_id
            FROM users
            WHERE role = 'owner'
            ORDER BY company_id, created_at ASC
        ) AS owner
        WHERE companies.id = owner.company_id
          AND companies.created_by IS NULL
        """
    )

    op.create_table(
        "company_locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("timezone", sa.String(length=80), nullable=False, server_default="Europe/Madrid"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_company_locations_company_id", "company_locations", ["company_id"])
    op.create_index("ix_company_locations_company_active", "company_locations", ["company_id", "is_active"])

    op.create_table(
        "company_usage_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("feature_name", sa.String(length=80), nullable=False),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_company_usage_logs_company_created", "company_usage_logs", ["company_id", "created_at"])
    op.create_index("ix_company_usage_logs_feature_created", "company_usage_logs", ["feature_name", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_company_usage_logs_feature_created", table_name="company_usage_logs")
    op.drop_index("ix_company_usage_logs_company_created", table_name="company_usage_logs")
    op.drop_table("company_usage_logs")
    op.drop_index("ix_company_locations_company_active", table_name="company_locations")
    op.drop_index("ix_company_locations_company_id", table_name="company_locations")
    op.drop_table("company_locations")
    op.drop_index("ix_companies_created_by", table_name="companies")
    op.drop_constraint("fk_companies_created_by_users", "companies", type_="foreignkey")
    op.drop_constraint("companies_plan_type_valid", "companies", type_="check")
    op.drop_column("companies", "created_by")
    op.drop_column("companies", "is_active_subscription")
    op.drop_column("companies", "trial_ends_at")
    op.drop_column("companies", "has_support")
    op.drop_column("companies", "has_admin_reports")
    op.drop_column("companies", "has_multi_location")
    op.drop_column("companies", "has_advanced_filters")
    op.drop_column("companies", "has_exports")
    op.drop_column("companies", "max_employees")
    op.drop_column("companies", "plan_type")
