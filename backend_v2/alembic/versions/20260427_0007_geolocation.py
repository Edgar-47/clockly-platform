"""feat: add geolocation fields to attendance sessions and work locations

Revision ID: 20260427_0007
Revises: 20260427_0006
Create Date: 2026-04-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260427_0007"
down_revision: str = "20260427_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add coordinates + radius to company_locations
    op.add_column("company_locations", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("company_locations", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column(
        "company_locations",
        sa.Column("allowed_radius_meters", sa.Integer(), nullable=False, server_default="100"),
    )

    # Add geolocation fields to attendance_sessions — clock-in
    op.add_column("attendance_sessions", sa.Column("clock_in_latitude", sa.Float(), nullable=True))
    op.add_column("attendance_sessions", sa.Column("clock_in_longitude", sa.Float(), nullable=True))
    op.add_column("attendance_sessions", sa.Column("clock_in_accuracy_meters", sa.Float(), nullable=True))
    op.add_column(
        "attendance_sessions",
        sa.Column(
            "clock_in_location_status",
            sa.String(length=16),
            nullable=True,
        ),
    )
    op.add_column("attendance_sessions", sa.Column("clock_in_distance_meters", sa.Float(), nullable=True))

    # Add geolocation fields to attendance_sessions — clock-out
    op.add_column("attendance_sessions", sa.Column("clock_out_latitude", sa.Float(), nullable=True))
    op.add_column("attendance_sessions", sa.Column("clock_out_longitude", sa.Float(), nullable=True))
    op.add_column("attendance_sessions", sa.Column("clock_out_accuracy_meters", sa.Float(), nullable=True))
    op.add_column(
        "attendance_sessions",
        sa.Column(
            "clock_out_location_status",
            sa.String(length=16),
            nullable=True,
        ),
    )
    op.add_column("attendance_sessions", sa.Column("clock_out_distance_meters", sa.Float(), nullable=True))

    # Meta columns
    op.add_column(
        "attendance_sessions",
        sa.Column("location_source", sa.String(length=16), nullable=False, server_default="unknown"),
    )
    op.add_column(
        "attendance_sessions",
        sa.Column("location_permission_status", sa.String(length=16), nullable=False, server_default="unknown"),
    )

    # Index for quick geo queries
    op.create_index(
        "ix_attendance_sessions_has_location",
        "attendance_sessions",
        ["company_id", "clock_in_latitude"],
    )


def downgrade() -> None:
    op.drop_index("ix_attendance_sessions_has_location", table_name="attendance_sessions")
    op.drop_column("attendance_sessions", "location_permission_status")
    op.drop_column("attendance_sessions", "location_source")
    op.drop_column("attendance_sessions", "clock_out_distance_meters")
    op.drop_column("attendance_sessions", "clock_out_location_status")
    op.drop_column("attendance_sessions", "clock_out_accuracy_meters")
    op.drop_column("attendance_sessions", "clock_out_longitude")
    op.drop_column("attendance_sessions", "clock_out_latitude")
    op.drop_column("attendance_sessions", "clock_in_distance_meters")
    op.drop_column("attendance_sessions", "clock_in_location_status")
    op.drop_column("attendance_sessions", "clock_in_accuracy_meters")
    op.drop_column("attendance_sessions", "clock_in_longitude")
    op.drop_column("attendance_sessions", "clock_in_latitude")
    op.drop_column("company_locations", "allowed_radius_meters")
    op.drop_column("company_locations", "longitude")
    op.drop_column("company_locations", "latitude")
