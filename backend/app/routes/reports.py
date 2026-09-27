from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_shop_context
from app.db.database import get_db
from app.models import (
    InventoryMovement,
    Payment,
    Product,
    Purchase,
    Sale,
    SaleItem,
    Shop,
)
from app.schemas import (
    DashboardSaleSummaryResponse,
    DashboardStockSummaryResponse,
    DashboardSummaryResponse,
    ProductSalesSummaryResponse,
    ReportsSummaryResponse,
)

router = APIRouter(prefix="/api", tags=["dashboard and reports"])
LOW_STOCK_THRESHOLD = 5
CENT = Decimal("0.01")


def _money(value: Decimal | int | None) -> Decimal:
    return Decimal(value or 0).quantize(CENT, rounding=ROUND_HALF_UP)


def _recorded_sale_payments(
    session: Session,
    shop_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Decimal:
    query = (
        select(func.coalesce(func.sum(Payment.amount), 0))
        .join(Sale, Sale.sale_id == Payment.sale_id)
        .where(
            Payment.shop_id == shop_id,
            Payment.status == "recorded",
            Sale.shop_id == shop_id,
            Sale.status == "completed",
        )
    )
    if start_date is not None and end_date is not None:
        query = query.where(Payment.payment_date.between(start_date, end_date))
    return _money(session.scalar(query))


def _recorded_purchase_payments(
    session: Session,
    shop_id: UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Decimal:
    query = (
        select(func.coalesce(func.sum(Payment.amount), 0))
        .join(Purchase, Purchase.purchase_id == Payment.purchase_id)
        .where(
            Payment.shop_id == shop_id,
            Payment.status == "recorded",
            Purchase.shop_id == shop_id,
            Purchase.status == "received",
        )
    )
    if start_date is not None and end_date is not None:
        query = query.where(Payment.payment_date.between(start_date, end_date))
    return _money(session.scalar(query))


def _inventory_subquery(shop_id: UUID):
    return (
        select(
            InventoryMovement.product_id.label("product_id"),
            func.sum(InventoryMovement.quantity_delta).label("quantity_on_hand"),
        )
        .where(InventoryMovement.shop_id == shop_id)
        .group_by(InventoryMovement.product_id)
        .subquery()
    )


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    today = date.today()
    sales_total, bill_count = session.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.sale_id),
        ).where(
            Sale.shop_id == shop.shop_id,
            Sale.sale_date == today,
            Sale.status == "completed",
        )
    ).one()

    inventory = _inventory_subquery(shop.shop_id)
    available_quantity = func.coalesce(inventory.c.quantity_on_hand, 0)
    stock_filters = (
        Product.shop_id == shop.shop_id,
        Product.is_active.is_(True),
        available_quantity <= LOW_STOCK_THRESHOLD,
    )
    low_stock_count = session.scalar(
        select(func.count(Product.product_id))
        .select_from(Product)
        .outerjoin(inventory, inventory.c.product_id == Product.product_id)
        .where(*stock_filters)
    )
    low_stock_products = session.execute(
        select(
            Product.product_id,
            Product.name,
            Product.part_number,
            Product.unit,
            available_quantity.label("quantity_on_hand"),
        )
        .select_from(Product)
        .outerjoin(inventory, inventory.c.product_id == Product.product_id)
        .where(*stock_filters)
        .order_by(available_quantity, Product.name)
        .limit(10)
    ).all()
    recent_sales = session.scalars(
        select(Sale)
        .options(selectinload(Sale.customer))
        .where(
            Sale.shop_id == shop.shop_id,
            Sale.status == "completed",
        )
        .order_by(Sale.sale_date.desc(), Sale.created_at.desc())
        .limit(5)
    ).all()

    return DashboardSummaryResponse(
        today_sales_total=_money(sales_total),
        today_bill_count=bill_count,
        low_stock_threshold=LOW_STOCK_THRESHOLD,
        low_stock_count=low_stock_count or 0,
        low_stock_products=[
            DashboardStockSummaryResponse(
                product_id=product_id,
                name=name,
                part_number=part_number,
                unit=unit,
                quantity_on_hand=quantity_on_hand,
            )
            for product_id, name, part_number, unit, quantity_on_hand
            in low_stock_products
        ],
        recent_sales=[
            DashboardSaleSummaryResponse(
                sale_id=sale.sale_id,
                invoice_number=sale.invoice_number,
                sale_date=sale.sale_date,
                customer_name=sale.customer.name if sale.customer else "Walk-in customer",
                total_amount=sale.total_amount,
            )
            for sale in recent_sales
        ],
    )


@router.get("/reports/summary", response_model=ReportsSummaryResponse)
def get_reports_summary(
    shop: Annotated[Shop, Depends(get_shop_context)],
    start_date: Annotated[date, Query()],
    end_date: Annotated[date, Query()],
    session: Session = Depends(get_db),
) -> ReportsSummaryResponse:
    if start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="The start date must be on or before the end date.",
        )

    sale_filters = (
        Sale.shop_id == shop.shop_id,
        Sale.status == "completed",
        Sale.sale_date.between(start_date, end_date),
    )
    sales_total, sales_count = session.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.sale_id),
        ).where(*sale_filters)
    ).one()

    purchase_filters = (
        Purchase.shop_id == shop.shop_id,
        Purchase.status == "received",
        Purchase.purchase_date.between(start_date, end_date),
    )
    purchases_total, purchase_count = session.execute(
        select(
            func.coalesce(func.sum(Purchase.total_amount), 0),
            func.count(Purchase.purchase_id),
        ).where(*purchase_filters)
    ).one()

    sales_payments_received = _recorded_sale_payments(
        session,
        shop.shop_id,
        start_date,
        end_date,
    )
    supplier_payments_made = _recorded_purchase_payments(
        session,
        shop.shop_id,
        start_date,
        end_date,
    )

    all_sales_total = session.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
            Sale.shop_id == shop.shop_id,
            Sale.status == "completed",
        )
    )
    all_purchases_total = session.scalar(
        select(func.coalesce(func.sum(Purchase.total_amount), 0)).where(
            Purchase.shop_id == shop.shop_id,
            Purchase.status == "received",
        )
    )

    top_products = session.execute(
        select(
            SaleItem.product_name,
            SaleItem.part_number,
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(
                SaleItem.unit_price * SaleItem.quantity
                - SaleItem.discount_amount
                + SaleItem.gst_amount
            ).label("sales_total"),
        )
        .join(Sale, Sale.sale_id == SaleItem.sale_id)
        .where(
            SaleItem.shop_id == shop.shop_id,
            *sale_filters,
        )
        .group_by(SaleItem.product_name, SaleItem.part_number)
        .order_by(
            func.sum(SaleItem.quantity).desc(),
            func.sum(
                SaleItem.unit_price * SaleItem.quantity
                - SaleItem.discount_amount
                + SaleItem.gst_amount
            ).desc(),
            SaleItem.product_name,
        )
        .limit(10)
    ).all()

    return ReportsSummaryResponse(
        start_date=start_date,
        end_date=end_date,
        sales_count=sales_count,
        sales_total=_money(sales_total),
        sales_payments_received=sales_payments_received,
        purchase_count=purchase_count,
        purchases_total=_money(purchases_total),
        supplier_payments_made=supplier_payments_made,
        customer_outstanding=_money(
            Decimal(all_sales_total or 0) - _recorded_sale_payments(
                session,
                shop.shop_id,
            )
        ),
        supplier_outstanding=_money(
            Decimal(all_purchases_total or 0) - _recorded_purchase_payments(
                session,
                shop.shop_id,
            )
        ),
        top_products=[
            ProductSalesSummaryResponse(
                product_name=product_name,
                part_number=part_number,
                quantity_sold=quantity_sold,
                sales_total=_money(product_sales_total),
            )
            for (
                product_name,
                part_number,
                quantity_sold,
                product_sales_total,
            ) in top_products
        ],
    )
