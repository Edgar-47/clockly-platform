"""feat: add user invitations

Revision ID: 20260427_0006
Revises: 20260422_0005
Create Date: 2026-04-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "20260427_0006"
down_revision: str = "20260422_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "role IN ('owner', 'admin', 'manager', 'employee')",
            name="user_invitations_role_valid",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'expired', 'revoked')",
            name="user_invitations_status_valid",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_user_invitations_company_id", "user_invitations", ["company_id"])
    op.create_index("ix_user_invitations_company_status", "user_invitations", ["company_id", "status"])
    op.create_index("ix_user_invitations_invited_by_user_id", "user_invitations", ["invited_by_user_id"])
    op.create_index("ix_user_invitations_token_hash", "user_invitations", ["token_hash"], unique=True)
    op.create_index(
        "uq_user_invitations_company_email_pending",
        "user_invitations",
        ["company_id", "email"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index("uq_user_invitations_company_email_pending", table_name="user_invitations")
    op.drop_index("ix_user_invitations_token_hash", table_name="user_invitations")
    op.drop_index("ix_user_invitations_invited_by_user_id", table_name="user_invitations")
    op.drop_index("ix_user_invitations_company_status", table_name="user_invitations")
    op.drop_index("ix_user_invitations_company_id", table_name="user_invitations")
    op.drop_table("user_invitations")
