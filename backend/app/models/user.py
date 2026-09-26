import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('shop_user', 'super_admin')",
            name="ck_users_role",
        ),
        CheckConstraint(
            "(role = 'shop_user' AND shop_id IS NOT NULL) OR "
            "(role = 'super_admin' AND shop_id IS NULL)",
            name="ck_users_shop_scope",
        ),
        Index("ix_users_shop_id", "shop_id"),
        UniqueConstraint("username", name="uq_users_username"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    shop_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("shops.shop_id", ondelete="RESTRICT"),
    )
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="shop_user",
        server_default="shop_user",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    shop: Mapped["Shop | None"] = relationship(
        back_populates="users",
        foreign_keys=[shop_id],
    )
