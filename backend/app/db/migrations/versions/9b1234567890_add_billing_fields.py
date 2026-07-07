"""add_billing_fields

Revision ID: 9b1234567890
Revises: a873e16abcde
Create Date: 2026-07-08 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9b1234567890'
down_revision: Union[str, None] = 'a873e16abcde'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column("businesses", sa.Column("is_lifetime_access", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("businesses", sa.Column("subscription_ends_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("businesses", sa.Column("is_manually_paused", sa.Boolean(), server_default=sa.text("false"), nullable=False))

def downgrade() -> None:
    op.drop_column("businesses", "is_manually_paused")
    op.drop_column("businesses", "subscription_ends_at")
    op.drop_column("businesses", "is_lifetime_access")
