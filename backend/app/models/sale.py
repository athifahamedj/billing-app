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
    from app.models.customer import Customer
    from app.models.payment import Payment


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_sales_subtotal_nonnegative"),
        CheckConstraint(
            "discount_amount >= 0",
            name="ck_sales_discount_nonnegative",
        ),
        CheckConstraint(
            "taxable_amount >= 0",
            name="ck_sales_taxable_nonnegative",
        ),
        CheckConstraint("gst_amount >= 0", name="ck_sales_gst_nonnegative"),
        CheckConstraint("total_amount >= 0", name="ck_sales_total_nonnegative"),
        CheckConstraint(
            "status IN ('draft', 'completed', 'void')",
            name="ck_sales_status",
        ),
        ForeignKeyConstraint(
            ["shop_id", "customer_id"],
            ["customers.shop_id", "customers.customer_id"],
            name="fk_sales_shop_customer",
            ondelete="RESTRICT",
        ),
        Index("ix_sales_shop_customer", "shop_id", "customer_id"),
        Index("ix_sales_shop_sale_date", "shop_id", "sale_date"),
        UniqueConstraint("shop_id", "sale_id", name="uq_sales_shop_sale"),
        UniqueConstraint(
            "shop_id",
            "invoice_number",
            name="uq_sales_shop_invoice",
        ),
    )

    sale_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("shops.shop_id", ondelete="RESTRICT"),
        nullable=False,
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    sale_date: Mapped[date] = mapped_column(Date, nullable=False)
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
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale")
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="sale",
        foreign_keys="Payment.sale_id",
    )
    customer: Mapped["Customer | None"] = relationship(
        foreign_keys=[customer_id],
    )


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_items_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_sale_items_unit_price_nonnegative"),
        CheckConstraint(
            "discount_amount >= 0",
            name="ck_sale_items_discount_nonnegative",
        ),
        CheckConstraint(
            "gst_rate >= 0 AND gst_rate <= 100",
            name="ck_sale_items_gst_rate_range",
        ),
        CheckConstraint("gst_amount >= 0", name="ck_sale_items_gst_nonnegative"),
        ForeignKeyConstraint(
            ["shop_id", "sale_id"],
            ["sales.shop_id", "sales.sale_id"],
            name="fk_sale_items_shop_sale",
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["shop_id", "product_id"],
            ["products.shop_id", "products.product_id"],
            name="fk_sale_items_shop_product",
            ondelete="RESTRICT",
        ),
        Index("ix_sale_items_shop_sale", "shop_id", "sale_id"),
        Index("ix_sale_items_shop_product", "shop_id", "product_id"),
        UniqueConstraint(
            "shop_id",
            "sale_item_id",
            name="uq_sale_items_shop_sale_item",
        ),
        UniqueConstraint(
            "shop_id",
            "product_id",
            "sale_item_id",
            name="uq_sale_items_shop_product_sale_item",
        ),
    )

    sale_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    sale_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
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
    sale: Mapped["Sale"] = relationship(back_populates="items")
