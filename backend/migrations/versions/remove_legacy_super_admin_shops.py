"""Remove legacy super-admin shop mapping

Revision ID: d0d6a541a12b
Revises: b50f1d2a8c73
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0d6a541a12b"
down_revision: Union[str, None] = "b50f1d2a8c73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("super_admin_shops")
    op.drop_constraint("uq_users_id_role", "users", type_="unique")
    op.alter_column("users", "id", new_column_name="user_id")
    op.create_index("ix_users_shop_id", "users", ["shop_id"])


def downgrade() -> None:
    op.drop_index("ix_users_shop_id", table_name="users")
    op.alter_column("users", "user_id", new_column_name="id")
    op.create_unique_constraint("uq_users_id_role", "users", ["id", "role"])
    op.create_table(
        "super_admin_shops",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "user_role",
            sa.String(length=20),
            server_default="super_admin",
            nullable=False,
        ),
        sa.Column("shop_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "user_role = 'super_admin'",
            name="ck_super_admin_shops_role",
        ),
        sa.ForeignKeyConstraint(
            ["shop_id"],
            ["shops.shop_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id", "user_role"],
            ["users.id", "users.role"],
            ondelete="CASCADE",
            name="fk_super_admin_shops_user_role",
        ),
        sa.PrimaryKeyConstraint("user_id", "shop_id"),
    )
