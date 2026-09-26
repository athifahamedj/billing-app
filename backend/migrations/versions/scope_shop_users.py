"""Enforce shop-user and super-admin shop scope

Revision ID: b50f1d2a8c73
Revises: 8c04be8d41f7
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b50f1d2a8c73"
down_revision: Union[str, None] = "8c04be8d41f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("shop_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_users_shop_id_shops",
        "users",
        "shops",
        ["shop_id"],
        ["shop_id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_users_shop_scope",
        "users",
        "(role = 'shop_user' AND shop_id IS NOT NULL) OR "
        "(role = 'super_admin' AND shop_id IS NULL)",
    )
    op.create_unique_constraint("uq_users_id_role", "users", ["id", "role"])

    op.drop_constraint("user_shops_user_id_fkey", "user_shops", type_="foreignkey")
    op.rename_table("user_shops", "super_admin_shops")
    op.add_column(
        "super_admin_shops",
        sa.Column(
            "user_role",
            sa.String(length=20),
            server_default="super_admin",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_super_admin_shops_role",
        "super_admin_shops",
        "user_role = 'super_admin'",
    )
    op.create_foreign_key(
        "fk_super_admin_shops_user_role",
        "super_admin_shops",
        "users",
        ["user_id", "user_role"],
        ["id", "role"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_super_admin_shops_user_role",
        "super_admin_shops",
        type_="foreignkey",
    )
    op.drop_constraint(
        "ck_super_admin_shops_role",
        "super_admin_shops",
        type_="check",
    )
    op.drop_column("super_admin_shops", "user_role")
    op.rename_table("super_admin_shops", "user_shops")
    op.create_foreign_key(
        "user_shops_user_id_fkey",
        "user_shops",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("uq_users_id_role", "users", type_="unique")
    op.drop_constraint("ck_users_shop_scope", "users", type_="check")
    op.drop_constraint("fk_users_shop_id_shops", "users", type_="foreignkey")
    op.drop_column("users", "shop_id")
