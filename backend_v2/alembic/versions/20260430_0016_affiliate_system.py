"""affiliate system

Revision ID: 20260430_0016
Revises: 20260430_0015
Create Date: 2026-04-30
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260430_0016"
down_revision = "20260430_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "affiliates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("partner_name", sa.String(160), nullable=False),
        sa.Column("partner_email", sa.String(255), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("commission_rate", sa.Numeric(5, 4), nullable=False, server_default="0.2000"),
        sa.Column("total_earned", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("code", name="uq_affiliates_code"),
    )
    op.create_index("ix_affiliates_is_active", "affiliates", ["is_active"])
    op.create_index("ix_affiliates_company_id", "affiliates", ["company_id"])
    op.create_index("ix_affiliates_partner_email", "affiliates", ["partner_email"])

    op.create_table(
        "affiliate_referrals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("affiliate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("affiliates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="trial"),
        sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("churned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("referred_company_id", name="uq_referrals_company"),
    )
    op.create_index("ix_referrals_affiliate_status", "affiliate_referrals", ["affiliate_id", "status"])
    op.create_index("ix_referrals_affiliate_id", "affiliate_referrals", ["affiliate_id"])


def downgrade() -> None:
    op.drop_table("affiliate_referrals")
    op.drop_table("affiliates")
