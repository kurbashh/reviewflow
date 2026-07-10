"""Add is_resolved

Revision ID: da30a5c1cd41
Revises: 9b1234567891
Create Date: 2026-07-10 17:14:27.683931

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'da30a5c1cd41'
down_revision: Union[str, None] = '9b1234567891'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('review_requests', sa.Column('is_resolved', sa.Boolean(), server_default='false', nullable=False))
    # ### end Alembic commands ###


def downgrade() -> None:
    op.drop_column('review_requests', 'is_resolved')
    # ### end Alembic commands ###
