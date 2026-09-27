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
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.purchase import Purchase
    from app.models.sale import Sale


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "(sale_id IS NOT NULL AND purchase_id IS NULL) OR "
            "(sale_id IS NULL AND purchase_id IS NOT NULL)",
            name="ck_payments_exactly_one_transaction",
        ),
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        CheckConstraint(
            "status IN ('recorded', 'void')",
            name="ck_payments_status",
        ),
        CheckConstraint(
            "status <> 'void' OR void_reason IS NOT NULL",
            name="ck_payments_void_reason_required",
        ),
        ForeignKeyConstraint(
            ["shop_id", "sale_id"],
            ["sales.shop_id", "sales.sale_id"],
            name="fk_payments_shop_sale",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["shop_id", "purchase_id"],
            ["purchases.shop_id", "purchases.purchase_id"],
            name="fk_payments_shop_purchase",
            ondelete="RESTRICT",
        ),
        Index("ix_payments_shop_sale", "shop_id", "sale_id"),
        Index("ix_payments_shop_purchase", "shop_id", "purchase_id"),
        Index("ix_payments_shop_date", "shop_id", "payment_date"),
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    shop_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("shops.shop_id", ondelete="RESTRICT"),
        nullable=False,
    )
    sale_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    purchase_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="recorded",
        server_default="recorded",
    )
    void_reason: Mapped[str | None] = mapped_column(Text)
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
    sale: Mapped["Sale | None"] = relationship(
        back_populates="payments",
        foreign_keys=[sale_id],
    )
    purchase: Mapped["Purchase | None"] = relationship(
        back_populates="payments",
        foreign_keys=[purchase_id],
    )
