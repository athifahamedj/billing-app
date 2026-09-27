"""Enforce shop-user and super-admin shop scope

Revision ID: b50f1d2a8c73
Revises: 8c04be8d41f7
"""

from typing import Sequence, Union

from alembic import op


revision: str = "b50f1d2a8c73"
down_revision: Union[str, None] = "8c04be8d41f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass