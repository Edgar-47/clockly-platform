"""Add board notes and labels

Revision ID: 20260521_0022
Revises: 20260520_0021
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260521_0022"
down_revision = "20260520_0021"
branch_labels = None
depends_on = None


BOARD_NOTE_STATUSES = ("pending", "in_progress", "completed", "archived")
BOARD_NOTE_PRIORITIES = ("low", "medium", "high", "urgent")
BOARD_LABEL_COLORS = (
    "blue",
    "green",
    "orange",
    "red",
    "purple",
    "pink",
    "gray",
    "yellow",
    "cyan",
)


def _in_values(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)


def upgrade() -> None:
    op.create_table(
        "board_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("priority", sa.String(32), nullable=False, server_default="medium"),
        sa.Column("reminder_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            f"status in ({_in_values(BOARD_NOTE_STATUSES)})",
            name="status_allowed",
        ),
        sa.CheckConstraint(
            f"priority in ({_in_values(BOARD_NOTE_PRIORITIES)})",
            name="priority_allowed",
        ),
    )
    op.create_index("ix_board_notes_company_status", "board_notes", ["company_id", "status"])
    op.create_index("ix_board_notes_company_priority", "board_notes", ["company_id", "priority"])
    op.create_index("ix_board_notes_company_reminder", "board_notes", ["company_id", "reminder_at"])
    op.create_index("ix_board_notes_company_created", "board_notes", ["company_id", "created_at"])

    op.create_table(
        "board_labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("color", sa.String(24), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            f"color in ({_in_values(BOARD_LABEL_COLORS)})",
            name="board_label_color_allowed",
        ),
    )
    op.create_index("ix_board_labels_company", "board_labels", ["company_id"])
    op.create_index(
        "uq_board_labels_company_lower_name",
        "board_labels",
        ["company_id", sa.text("lower(name)")],
        unique=True,
    )

    op.create_table(
        "board_note_labels",
        sa.Column(
            "note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("board_notes.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "label_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("board_labels.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
    )
    op.create_index("ix_board_note_labels_label", "board_note_labels", ["label_id"])


def downgrade() -> None:
    op.drop_index("ix_board_note_labels_label", table_name="board_note_labels")
    op.drop_table("board_note_labels")
    op.drop_index("uq_board_labels_company_lower_name", table_name="board_labels")
    op.drop_index("ix_board_labels_company", table_name="board_labels")
    op.drop_table("board_labels")
    op.drop_index("ix_board_notes_company_created", table_name="board_notes")
    op.drop_index("ix_board_notes_company_reminder", table_name="board_notes")
    op.drop_index("ix_board_notes_company_priority", table_name="board_notes")
    op.drop_index("ix_board_notes_company_status", table_name="board_notes")
    op.drop_table("board_notes")
