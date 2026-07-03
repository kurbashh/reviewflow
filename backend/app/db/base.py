"""
app/db/base.py

Базовый класс для всех декларативных моделей SQLAlchemy 2.0.
Вынесен отдельно от models.py, чтобы избежать circular imports
между models.py и Alembic env.py.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Общий предок для всех ORM-моделей проекта."""
    pass