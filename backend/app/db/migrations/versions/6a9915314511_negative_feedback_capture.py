"""negative_feedback_capture

Revision ID: 6a9915314511
Revises: 8c988832d266
Create Date: 2026-07-06 21:00:00.000000

Этап 3.2 ТЗ: перехват негатива (оценка 1-3).

Т.к. review_request_status хранится как native_enum=False (обычный
VARCHAR + CHECK на стороне приложения, см. app/db/models.py::_pg_enum),
добавление нового значения "awaiting_feedback" не требует
ALTER TYPE ... ADD VALUE (главная причина, по которой native_enum
изначально отключён в проекте) — миграция ограничивается только
добавлением новой колонки owner_feedback.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6a9915314511'
down_revision: Union[str, None] = '8c988832d266'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "review_requests",
        sa.Column("owner_feedback", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("review_requests", "owner_feedback")
