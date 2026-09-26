"""create businesses

Revision ID: 66092f397abe
Revises:
Create Date: 2026-09-26 12:21:08.675641
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "66092f397abe"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("gstin", sa.String(length=15), nullable=True),
        sa.Column(
            "timezone_name",
            sa.String(length=64),
            server_default="Asia/Kolkata",
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )


def downgrade() -> None:
    op.drop_table("businesses")
