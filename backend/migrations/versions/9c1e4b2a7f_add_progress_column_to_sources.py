"""add progress column to sources

Revision ID: 9c1e4b2a7f
Revises: 395c1803883d
Create Date: 2026-02-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "9c1e4b2a7f"
down_revision = "395c1803883d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sources",
        sa.Column(
            "progress",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        if_not_exists=True,
    )
    op.alter_column("sources", "progress", server_default=None)


def downgrade() -> None:
    op.drop_column("sources", "progress")
