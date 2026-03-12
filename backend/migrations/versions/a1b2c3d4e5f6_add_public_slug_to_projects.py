"""add_public_slug_to_projects

Revision ID: a1b2c3d4e5f6
Revises: 395c1803883d
Create Date: 2026-02-23 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9c1e4b2a7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add public_slug and public_chat_enabled columns to projects table."""
    op.add_column('projects', sa.Column('public_slug', sa.String(), nullable=True))
    op.add_column('projects', sa.Column('public_chat_enabled', sa.Boolean(), nullable=False, server_default='true'))
    op.create_index(op.f('ix_projects_public_slug'), 'projects', ['public_slug'], unique=True)


def downgrade() -> None:
    """Remove public_slug and public_chat_enabled columns from projects table."""
    op.drop_index(op.f('ix_projects_public_slug'), table_name='projects')
    op.drop_column('projects', 'public_chat_enabled')
    op.drop_column('projects', 'public_slug')
