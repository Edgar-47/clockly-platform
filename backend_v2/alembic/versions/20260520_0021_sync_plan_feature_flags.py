"""Sync company feature flags with plan_type

Ensures has_multi_location, has_exports, has_geolocation, etc. are consistent
with each company's plan_type. Fixes companies where plan_type was updated
directly without going through apply_plan_to_company().

Revision ID: 20260520_0021
Revises: 20260519_0020
Create Date: 2026-05-20
"""
from alembic import op

revision = "20260520_0021"
down_revision = "20260519_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE companies SET
            has_exports            = true,
            has_advanced_filters   = true,
            has_multi_location     = true,
            has_geolocation        = true,
            has_admin_reports      = true,
            has_support            = true,
            max_employees          = NULL
        WHERE plan_type = 'business'
    """)

    op.execute("""
        UPDATE companies SET
            has_exports            = true,
            has_advanced_filters   = true,
            has_multi_location     = false,
            has_geolocation        = true,
            has_admin_reports      = true,
            has_support            = true,
            max_employees          = 30
        WHERE plan_type = 'pro'
    """)

    op.execute("""
        UPDATE companies SET
            has_exports            = false,
            has_advanced_filters   = false,
            has_multi_location     = false,
            has_geolocation        = false,
            has_admin_reports      = false,
            has_support            = false,
            max_employees          = 5
        WHERE plan_type = 'free'
    """)


def downgrade() -> None:
    pass
