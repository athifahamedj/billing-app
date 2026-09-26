"""Rename businesses to shops and add user accounts

Revision ID: 8c04be8d41f7
Revises: 66092f397abe
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c04be8d41f7"
down_revision: Union[str, None] = "66092f397abe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("businesses", "shops")
    op.alter_column("shops", "id", new_column_name="shop_id")

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("shop_id", sa.Uuid(), nullable=True),
        sa.Column(
            "role",
            sa.String(length=20),
            server_default="shop_user",
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
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
        sa.CheckConstraint(
            "role IN ('shop_user', 'super_admin')",
            name="ck_users_role",
        ),
        sa.CheckConstraint(
            "(role = 'shop_user' AND shop_id IS NOT NULL) OR "
            "(role = 'super_admin' AND shop_id IS NULL)",
            name="ck_users_shop_scope",
        ),
        sa.ForeignKeyConstraint(
            ["shop_id"],
            ["shops.shop_id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.UniqueConstraint("id", "role", name="uq_users_id_role"),
    )
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


def downgrade() -> None:
    op.drop_table("super_admin_shops")
    op.drop_table("users")
    op.alter_column("shops", "shop_id", new_column_name="id")
    op.rename_table("shops", "businesses")
