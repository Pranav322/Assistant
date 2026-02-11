"""Add widget metrics table

Revision ID: 7a2c8b1e9f0c
Revises: 5f3c9d2e4a7b
Create Date: 2026-02-12 23:40:00

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "7a2c8b1e9f0c"
down_revision: Union[str, Sequence[str], None] = "5f3c9d2e4a7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "widget_metrics",
        sa.Column(
            "id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("project_id", sa.UUID(), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("value", sa.Numeric(12, 4), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_widget_metrics_project_time",
        "widget_metrics",
        ["project_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_widget_metrics_project_time", table_name="widget_metrics")
    op.drop_table("widget_metrics")
