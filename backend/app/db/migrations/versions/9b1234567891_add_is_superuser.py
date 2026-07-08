"""add_is_superuser

Revision ID: 9b1234567891
Revises: 9b1234567890
Create Date: 2026-07-08 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9b1234567891'
down_revision: Union[str, None] = '9b1234567890'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_superuser', sa.Boolean(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'is_superuser')
