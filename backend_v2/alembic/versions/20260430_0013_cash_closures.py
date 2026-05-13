"""feat: add cash closures module

Revision ID: 20260430_0013
Revises: 20260430_0012
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260430_0013"
down_revision: str = "20260430_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "cash_closures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("company_locations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "closed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "last_edited_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift", sa.String(16), nullable=False),
        sa.Column("custom_shift_name", sa.String(80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("theoretical_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("real_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("balance", sa.Numeric(12, 2), nullable=False),
        sa.Column("has_incidence", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("incidence_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("incidence_comment", sa.Text(), nullable=True),
        sa.Column("signature_name", sa.String(160), nullable=False),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cash_closures_company_date", "cash_closures", ["company_id", "date"])
    op.create_index("ix_cash_closures_company_location", "cash_closures", ["company_id", "location_id"])
    op.create_index("ix_cash_closures_company_user", "cash_closures", ["company_id", "closed_by_user_id"])
    op.create_index("ix_cash_closures_company_incidence", "cash_closures", ["company_id", "has_incidence"])

    op.create_table(
        "cash_closure_drawers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "closure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cash_closures.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("theoretical_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("real_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_cash_closure_drawers_closure", "cash_closure_drawers", ["closure_id"])

    op.create_table(
        "cash_closure_card_terminals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "closure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cash_closures.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("theoretical_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("real_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_cash_closure_card_terminals_closure",
        "cash_closure_card_terminals",
        ["closure_id"],
    )


def downgrade() -> None:
    op.drop_table("cash_closure_card_terminals")
    op.drop_table("cash_closure_drawers")
    op.drop_table("cash_closures")
