"""company: add cif, sector, company_size columns

Revision ID: 20260430_0015
Revises: 20260430_0014
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260430_0015"
down_revision: str = "20260430_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("cif", sa.String(20), nullable=True))
    op.add_column("companies", sa.Column("sector", sa.String(100), nullable=True))
    op.add_column("companies", sa.Column("company_size", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "company_size")
    op.drop_column("companies", "sector")
    op.drop_column("companies", "cif")
