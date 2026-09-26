import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('opening_stock', 'purchase', 'sale', 'adjustment', 'reversal')",
            name="ck_inventory_movements_type",
        ),
        CheckConstraint(
            "("
            "movement_type = 'opening_stock' AND quantity_delta >= 0 "
            "AND sale_item_id IS NULL AND purchase_item_id IS NULL "
            "AND reverses_movement_id IS NULL"
            ") OR ("
            "movement_type = 'purchase' AND quantity_delta > 0 "
            "AND purchase_item_id IS NOT NULL AND sale_item_id IS NULL "
            "AND reverses_movement_id IS NULL"
            ") OR ("
            "movement_type = 'sale' AND quantity_delta < 0 "
            "AND sale_item_id IS NOT NULL AND purchase_item_id IS NULL "
            "AND reverses_movement_id IS NULL"
            ") OR ("
            "movement_type = 'adjustment' AND quantity_delta <> 0 "
            "AND sale_item_id IS NULL AND purchase_item_id IS NULL "
            "AND reverses_movement_id IS NULL"
            ") OR ("
            "movement_type = 'reversal' AND quantity_delta <> 0 "
            "AND sale_item_id IS NULL AND purchase_item_id IS NULL "
            "AND reverses_movement_id IS NOT NULL"
            ")",
            name="ck_inventory_movements_source",
        ),
        ForeignKeyConstraint(
            ["shop_id", "product_id"],
            ["products.shop_id", "products.product_id"],
            name="fk_inventory_movements_shop_product",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["shop_id", "product_id", "sale_item_id"],
            [
                "sale_items.shop_id",
                "sale_items.product_id",
                "sale_items.sale_item_id",
            ],
            name="fk_inventory_movements_shop_sale_item",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["shop_id", "product_id", "purchase_item_id"],
            [
                "purchase_items.shop_id",
                "purchase_items.product_id",
                "purchase_items.purchase_item_id",
            ],
            name="fk_inventory_movements_shop_purchase_item",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["shop_id", "product_id", "reverses_movement_id"],
            [
                "inventory_movements.shop_id",
                "inventory_movements.product_id",
                "inventory_movements.movement_id",
            ],
            name="fk_inventory_movements_reversal",
            ondelete="RESTRICT",
        ),
        Index(
            "uq_inventory_movements_opening_product",
            "shop_id",
            "product_id",
            unique=True,
            postgresql_where=text("movement_type = 'opening_stock'"),
        ),
        Index(
            "uq_inventory_movements_sale_item",
            "shop_id",
            "sale_item_id",
            unique=True,
            postgresql_where=text("sale_item_id IS NOT NULL"),
        ),
        Index(
            "uq_inventory_movements_purchase_item",
            "shop_id",
            "purchase_item_id",
            unique=True,
            postgresql_where=text("purchase_item_id IS NOT NULL"),
        ),
        Index(
            "uq_inventory_movements_reversal",
            "shop_id",
            "reverses_movement_id",
            unique=True,
            postgresql_where=text("reverses_movement_id IS NOT NULL"),
        ),
        Index(
            "ix_inventory_movements_shop_product_created",
            "shop_id",
            "product_id",
            "created_at",
        ),
        UniqueConstraint(
            "shop_id",
            "movement_id",
            name="uq_inventory_movements_shop_movement",
        ),
        UniqueConstraint(
            "shop_id",
            "product_id",
            "movement_id",
            name="uq_inventory_movements_shop_product_movement",
        ),
    )

    movement_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("shops.shop_id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    sale_item_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    purchase_item_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    reverses_movement_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
