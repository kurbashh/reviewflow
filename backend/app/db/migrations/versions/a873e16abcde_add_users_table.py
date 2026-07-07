"""add_users_table_and_owner_fk

Revision ID: a873e16abcde
Revises: 6a9915314511
Create Date: 2026-07-07 23:00:00.000000
"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a873e16abcde'
down_revision: Union[str, None] = '6a9915314511'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Создаем таблицу users
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # 2. Добавляем owner_id в businesses (пока nullable=True для совместимости с живыми данными)
    op.add_column("businesses", sa.Column("owner_id", sa.UUID(), nullable=True))

    # 3. Вставляем дефолтного пользователя-заглушку для существующих компаний, чтобы не нарушать констреинты
    system_user_id = "00000000-0000-0000-0000-000000000000"
    op.execute(
        f"INSERT INTO users (id, email, password_hash, full_name, is_active) "
        f"VALUES ('{system_user_id}', 'system@reviewflow.kz', 'system_hashed_placeholder', 'System Owner', true) "
        f"ON CONFLICT DO NOTHING"
    )

    # 4. Привязываем существующие компании к дефолтному пользователю
    op.execute(f"UPDATE businesses SET owner_id = '{system_user_id}' WHERE owner_id IS NULL")

    # 5. Делаем owner_id обязательным (nullable=False) и создаем констреинт внешнего ключа
    op.alter_column("businesses", "owner_id", nullable=False)
    op.create_foreign_key(
        "fk_businesses_owner",
        "businesses",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_businesses_owner", "businesses", type_="foreignkey")
    op.drop_column("businesses", "owner_id")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
