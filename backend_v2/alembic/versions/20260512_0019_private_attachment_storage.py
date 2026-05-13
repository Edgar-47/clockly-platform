"""store private attachment object keys

Revision ID: 20260512_0019
Revises: 20260501_0018
Create Date: 2026-05-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260512_0019"
down_revision: str = "20260501_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "expense_tickets",
        "attachment_url",
        new_column_name="attachment_key",
        existing_type=sa.String(length=500),
        existing_nullable=True,
    )
    op.execute(
        """
        UPDATE expense_tickets
        SET attachment_key = 'legacy/expense-tickets/' || regexp_replace(attachment_key, '^.*/', '')
        WHERE attachment_key LIKE '/uploads/expense_tickets/%'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE expense_tickets
        SET attachment_key = '/uploads/expense_tickets/' || regexp_replace(attachment_key, '^.*/', '')
        WHERE attachment_key LIKE 'legacy/expense-tickets/%'
        """
    )
    op.alter_column(
        "expense_tickets",
        "attachment_key",
        new_column_name="attachment_url",
        existing_type=sa.String(length=500),
        existing_nullable=True,
    )
