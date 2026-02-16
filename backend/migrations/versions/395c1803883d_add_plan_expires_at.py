"""add_plan_expires_at

Revision ID: 395c1803883d
Revises: 1fb143392d63
Create Date: 2026-02-16 14:35:13.483212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '395c1803883d'
down_revision: Union[str, Sequence[str], None] = '1fb143392d63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add plan_expires_at column to users table."""
    op.add_column('users', sa.Column('plan_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove plan_expires_at column from users table."""
    op.drop_column('users', 'plan_expires_at')
