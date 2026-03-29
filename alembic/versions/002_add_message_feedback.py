"""Add feedback and feedback_reason columns to messages

Revision ID: 002_feedback
Revises: 001_initial
Create Date: 2026-03-29 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_feedback"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("feedback", sa.String(), nullable=True))
    op.add_column("messages", sa.Column("feedback_reason", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "feedback_reason")
    op.drop_column("messages", "feedback")
