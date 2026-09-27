import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.payment import Payment


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_purchases_subtotal_nonnegative"),
        CheckConstraint(
            "discount_amount >= 0",
            name="ck_purchases_discount_nonnegative",
        ),
        CheckConstraint(
            "taxable_amount >= 0",
            name="ck_purchases_taxable_nonnegative",
        ),
        CheckConstraint("gst_amount >= 0", name="ck_purchases_gst_nonnegative"),
        CheckConstraint("total_amount >= 0", name="ck_purchases_total_nonnegative"),
        CheckConstraint(
            "status IN ('draft', 'received', 'void')",
            name="ck_purchases_status",
        ),
        ForeignKeyConstraint(
            ["shop_id", "supplier_id"],
            ["suppliers.shop_id", "suppliers.supplier_id"],
            name="fk_purchases_shop_supplier",
            ondelete="RESTRICT",
        ),
        Index("ix_purchases_shop_supplier", "shop_id", "supplier_id"),
        Index("ix_purchases_shop_purchase_date", "shop_id", "purchase_date"),
        UniqueConstraint(
            "shop_id",
            "purchase_id",
            name="uq_purchases_shop_purchase",
        ),
        UniqueConstraint(
            "shop_id",
            "supplier_id",
            "invoice_number",
            name="uq_purchases_shop_supplier_invoice",
        ),
    )

    purchase_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("shops.shop_id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
    )
    taxable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    supplier: Mapped["Supplier"] = relationship(foreign_keys=[supplier_id])
    items: Mapped[list["PurchaseItem"]] = relationship(
        cascade="all, delete-orphan",
        order_by="PurchaseItem.created_at",
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="purchase",
        foreign_keys="Payment.purchase_id",
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


class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_purchase_items_quantity_positive",
        ),
        CheckConstraint(
            "unit_price >= 0",
            name="ck_purchase_items_unit_price_nonnegative",
        ),
        CheckConstraint(
            "discount_amount >= 0",
            name="ck_purchase_items_discount_nonnegative",
        ),
        CheckConstraint(
            "gst_rate >= 0 AND gst_rate <= 100",
            name="ck_purchase_items_gst_rate_range",
        ),
        CheckConstraint(
            "gst_amount >= 0",
            name="ck_purchase_items_gst_nonnegative",
        ),
        ForeignKeyConstraint(
            ["shop_id", "purchase_id"],
            ["purchases.shop_id", "purchases.purchase_id"],
            name="fk_purchase_items_shop_purchase",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["shop_id", "product_id"],
            ["products.shop_id", "products.product_id"],
            name="fk_purchase_items_shop_product",
            ondelete="RESTRICT",
        ),
        Index("ix_purchase_items_shop_purchase", "shop_id", "purchase_id"),
        Index("ix_purchase_items_shop_product", "shop_id", "product_id"),
        UniqueConstraint(
            "shop_id",
            "purchase_item_id",
            name="uq_purchase_items_shop_purchase_item",
        ),
        UniqueConstraint(
            "shop_id",
            "product_id",
            "purchase_item_id",
            name="uq_purchase_items_shop_product_purchase_item",
        ),
    )

    purchase_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    purchase_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    part_number: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
    )
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
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
