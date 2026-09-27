from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import get_shop_context
from app.db.database import get_db
from app.models import (
    Customer,
    InventoryMovement,
    Payment,
    Product,
    Purchase,
    Sale,
    SaleItem,
    Shop,
)
from app.schemas import (
    CustomerLedgerResponse,
    PaymentBatchWrite,
    PaymentResponse,
    PaymentVoidResponse,
    PaymentVoidWrite,
    PaymentWrite,
    SaleItemResponse,
    SaleInvoiceResponse,
    SaleResponse,
    SaleWrite,
)

router = APIRouter(prefix="/api", tags=["sales"])
CENT = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _sale_query(shop_id: UUID):
    return (
        select(Sale)
        .options(
            selectinload(Sale.items),
            selectinload(Sale.payments),
            selectinload(Sale.customer),
        )
        .where(Sale.shop_id == shop_id)
    )


def _sale_response(sale: Sale) -> SaleResponse:
    payments = sorted(
        sale.payments,
        key=lambda payment: (payment.payment_date, payment.created_at),
    )
    paid_amount = _money(
        sum(
            (
                payment.amount
                for payment in payments
                if payment.status == "recorded"
            ),
            Decimal("0"),
        )
    )
    if sale.status == "void":
        outstanding_amount = Decimal("0.00")
        payment_status = "void"
    else:
        outstanding_amount = _money(sale.total_amount - paid_amount)
        payment_status = (
            "paid"
            if outstanding_amount == 0
            else "partially_paid"
            if paid_amount > 0
            else "unpaid"
        )

    return SaleResponse(
        sale_id=sale.sale_id,
        shop_id=sale.shop_id,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else None,
        invoice_number=sale.invoice_number,
        sale_date=sale.sale_date,
        subtotal=sale.subtotal,
        discount_amount=sale.discount_amount,
        taxable_amount=sale.taxable_amount,
        gst_amount=sale.gst_amount,
        total_amount=sale.total_amount,
        status=sale.status,
        paid_amount=paid_amount,
        outstanding_amount=outstanding_amount,
        payment_status=payment_status,
        items=[
            SaleItemResponse(
                sale_item_id=item.sale_item_id,
                product_id=item.product_id,
                product_name=item.product_name,
                part_number=item.part_number,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_amount=item.discount_amount,
                gst_rate=item.gst_rate,
                gst_amount=item.gst_amount,
            )
            for item in sale.items
        ],
        payments=[
            PaymentResponse(
                payment_id=payment.payment_id,
                amount=payment.amount,
                payment_date=payment.payment_date,
                payment_method=payment.payment_method,
                reference=payment.reference,
                note=payment.note,
                status=payment.status,
                void_reason=payment.void_reason,
            )
            for payment in payments
        ],
    )


def _load_sale(
    session: Session,
    shop_id: UUID,
    sale_id: UUID,
) -> Sale | None:
    return session.scalar(
        _sale_query(shop_id).where(Sale.sale_id == sale_id)
    )


def _inventory_by_product(
    session: Session,
    shop_id: UUID,
    product_ids: list[UUID],
) -> dict[UUID, int]:
    return dict(
        session.execute(
            select(
                InventoryMovement.product_id,
                func.coalesce(func.sum(InventoryMovement.quantity_delta), 0),
            )
            .where(
                InventoryMovement.shop_id == shop_id,
                InventoryMovement.product_id.in_(product_ids),
            )
            .group_by(InventoryMovement.product_id)
        ).all()
    )


def _record_payments(
    session: Session,
    sale: Sale,
    payments: list[PaymentWrite],
) -> None:
    for payment in payments:
        session.add(
            Payment(
                shop_id=sale.shop_id,
                sale_id=sale.sale_id,
                amount=payment.amount,
                payment_date=payment.payment_date,
                payment_method=payment.payment_method,
                reference=payment.reference,
                note=payment.note,
                status="recorded",
            )
        )


def _raise_invoice_conflict(error: IntegrityError) -> None:
    constraint_name = getattr(
        getattr(error.orig, "diag", None),
        "constraint_name",
        None,
    )
    if constraint_name == "uq_sales_shop_invoice":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That invoice number already exists in this shop.",
        ) from error
    raise error


@router.get("/sales", response_model=list[SaleResponse])
def list_sales(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> list[SaleResponse]:
    query = _sale_query(shop.shop_id)
    search = q.strip() if q else ""
    if search:
        escaped = (
            search.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"%{escaped}%"
        query = query.outerjoin(Customer).where(
            or_(
                Sale.invoice_number.ilike(pattern, escape="\\"),
                Customer.name.ilike(pattern, escape="\\"),
            )
        )
    sales = session.scalars(
        query.order_by(Sale.sale_date.desc(), Sale.created_at.desc())
    )
    return [_sale_response(sale) for sale in sales]


@router.get(
    "/customers/{customer_id}/ledger",
    response_model=CustomerLedgerResponse,
)
def get_customer_ledger(
    customer_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> CustomerLedgerResponse:
    customer = session.scalar(
        select(Customer).where(
            Customer.shop_id == shop.shop_id,
            Customer.customer_id == customer_id,
        )
    )
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The customer was not found.",
        )

    customer_sales = list(
        session.scalars(
            _sale_query(shop.shop_id)
            .where(Sale.customer_id == customer_id)
            .order_by(Sale.sale_date.desc(), Sale.created_at.desc())
        )
    )
    total_invoiced = _money(
        sum(
            (
                sale.total_amount
                for sale in customer_sales
                if sale.status == "completed"
            ),
            Decimal("0"),
        )
    )
    total_paid = _money(
        sum(
            (
                payment.amount
                for sale in customer_sales
                if sale.status == "completed"
                for payment in sale.payments
                if payment.status == "recorded"
            ),
            Decimal("0"),
        )
    )
    sales = [_sale_response(sale) for sale in customer_sales]
    outstanding_amount = _money(total_invoiced - total_paid)

    return CustomerLedgerResponse(
        customer_id=customer.customer_id,
        customer_name=customer.name,
        total_invoiced=total_invoiced,
        total_paid=total_paid,
        outstanding_amount=outstanding_amount,
        sales=sales,
    )


@router.get(
    "/sales/{sale_id}/invoice",
    response_model=SaleInvoiceResponse,
)
def get_sale_invoice(
    sale_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> SaleInvoiceResponse:
    sale = _load_sale(session, shop.shop_id, sale_id)
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The sale was not found.",
        )
    if sale.status == "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A draft sale does not have an invoice.",
        )

    return SaleInvoiceResponse(
        shop_name=shop.name,
        shop_phone=shop.phone,
        shop_address=shop.address,
        shop_gstin=shop.gstin,
        customer_name=sale.customer.name if sale.customer else "Walk-in customer",
        customer_phone=sale.customer.phone if sale.customer else None,
        customer_address=sale.customer.address if sale.customer else None,
        customer_gstin=sale.customer.gstin if sale.customer else None,
        sale=_sale_response(sale),
    )


@router.post(
    "/sales",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sale(
    sale_data: SaleWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> SaleResponse:
    if sale_data.customer_id is None:
        customer = None
    else:
        customer = session.scalar(
            select(Customer).where(
                Customer.customer_id == sale_data.customer_id,
                Customer.shop_id == shop.shop_id,
                Customer.is_active.is_(True),
            )
        )
        if customer is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The customer was not found.",
            )

    product_ids = [item.product_id for item in sale_data.items]
    products = {
        product.product_id: product
        for product in session.scalars(
            select(Product)
            .where(
                Product.shop_id == shop.shop_id,
                Product.product_id.in_(product_ids),
                Product.is_active.is_(True),
            )
            .order_by(Product.product_id)
            .with_for_update()
        )
    }
    if len(products) != len(product_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more products are unavailable in this shop.",
        )

    inventory = _inventory_by_product(session, shop.shop_id, product_ids)
    for item in sale_data.items:
        product = products[item.product_id]
        available = inventory.get(item.product_id, 0)
        if available < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Insufficient stock for {product.name}: "
                    f"{available} available, {item.quantity} requested."
                ),
            )

    subtotal = Decimal("0")
    gst_amount = Decimal("0")
    prepared_items = []
    for item_data in sale_data.items:
        product = products[item_data.product_id]
        line_subtotal = _money(product.selling_price * item_data.quantity)
        gst_rate = product.gst_rate or Decimal("0")
        line_gst = _money(line_subtotal * gst_rate / Decimal("100"))
        subtotal += line_subtotal
        gst_amount += line_gst
        prepared_items.append(
            SaleItem(
                shop_id=shop.shop_id,
                product_id=product.product_id,
                product_name=product.name,
                part_number=product.part_number,
                quantity=item_data.quantity,
                unit_price=product.selling_price,
                discount_amount=Decimal("0"),
                gst_rate=gst_rate,
                gst_amount=line_gst,
            )
        )

    total_amount = _money(subtotal + gst_amount)
    initial_paid = _money(
        sum((payment.amount for payment in sale_data.payments), Decimal("0"))
    )
    if initial_paid > total_amount:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payments cannot exceed the sale total.",
        )

    invoice_number = sale_data.invoice_number or (
        f"SALE-{sale_data.sale_date:%Y%m%d}-{uuid4().hex[:8].upper()}"
    )
    sale = Sale(
        shop_id=shop.shop_id,
        customer_id=customer.customer_id if customer else None,
        invoice_number=invoice_number,
        sale_date=sale_data.sale_date,
        subtotal=subtotal,
        discount_amount=Decimal("0"),
        taxable_amount=subtotal,
        gst_amount=gst_amount,
        total_amount=total_amount,
        status="completed",
    )
    sale.items = prepared_items
    session.add(sale)
    try:
        session.flush()
        for item in sale.items:
            session.add(
                InventoryMovement(
                    shop_id=shop.shop_id,
                    product_id=item.product_id,
                    movement_type="sale",
                    quantity_delta=-item.quantity,
                    sale_item_id=item.sale_item_id,
                    note=f"Sale {sale.invoice_number}",
                )
            )
        _record_payments(session, sale, sale_data.payments)
        session.commit()
    except IntegrityError as error:
        session.rollback()
        _raise_invoice_conflict(error)

    created_sale = _load_sale(session, shop.shop_id, sale.sale_id)
    return _sale_response(created_sale)


@router.post(
    "/sales/{sale_id}/payments",
    response_model=SaleResponse,
)
def add_sale_payments(
    sale_id: UUID,
    payment_data: PaymentBatchWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> SaleResponse:
    sale = session.scalar(
        select(Sale)
        .where(Sale.shop_id == shop.shop_id, Sale.sale_id == sale_id)
        .with_for_update()
    )
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The sale was not found.",
        )
    if sale.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payments can only be added to a completed sale.",
        )

    paid_amount = session.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.shop_id == shop.shop_id,
            Payment.sale_id == sale_id,
            Payment.status == "recorded",
        )
    )
    incoming_amount = _money(
        sum(
            (payment.amount for payment in payment_data.payments),
            Decimal("0"),
        )
    )
    outstanding = _money(sale.total_amount - paid_amount)
    if incoming_amount > outstanding:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Payments cannot exceed the outstanding amount of {outstanding}.",
        )

    _record_payments(session, sale, payment_data.payments)
    session.commit()
    updated_sale = _load_sale(session, shop.shop_id, sale_id)
    return _sale_response(updated_sale)


@router.post(
    "/payments/{payment_id}/void",
    response_model=PaymentVoidResponse,
)
def void_payment(
    payment_id: UUID,
    void_data: PaymentVoidWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> PaymentVoidResponse:
    payment = session.scalar(
        select(Payment).where(
            Payment.shop_id == shop.shop_id,
            Payment.payment_id == payment_id,
        )
    )
    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The payment was not found.",
        )

    if payment.sale_id is not None:
        transaction_type = "sale"
        transaction_id = payment.sale_id
        sale = session.scalar(
            select(Sale)
            .where(
                Sale.shop_id == shop.shop_id,
                Sale.sale_id == transaction_id,
            )
            .with_for_update()
        )
        if sale is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The sale was not found.",
            )
        if sale.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payments can only be voided on a completed sale.",
            )
    elif payment.purchase_id is not None:
        transaction_type = "purchase"
        transaction_id = payment.purchase_id
        purchase = session.scalar(
            select(Purchase)
            .where(
                Purchase.shop_id == shop.shop_id,
                Purchase.purchase_id == transaction_id,
            )
            .with_for_update()
        )
        if purchase is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The purchase was not found.",
            )
        if purchase.status != "received":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payments can only be voided on a received purchase.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The payment is not associated with a transaction.",
        )

    payment = session.scalar(
        select(Payment)
        .where(
            Payment.shop_id == shop.shop_id,
            Payment.payment_id == payment_id,
        )
        .with_for_update()
    )
    if payment.status != "recorded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The payment is already void.",
        )

    payment.status = "void"
    payment.void_reason = void_data.reason
    session.commit()
    return PaymentVoidResponse(
        payment=PaymentResponse.model_validate(payment),
        transaction_type=transaction_type,
        transaction_id=transaction_id,
    )


@router.post(
    "/sales/{sale_id}/void",
    response_model=SaleResponse,
)
def void_sale(
    sale_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> SaleResponse:
    sale = session.scalar(
        _sale_query(shop.shop_id)
        .where(Sale.sale_id == sale_id)
        .with_for_update()
    )
    if sale is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The sale was not found.",
        )
    if sale.status == "void":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The sale is already void.",
        )
    if any(payment.status == "recorded" for payment in sale.payments):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Void or reverse the recorded payment first.",
        )

    if sale.status == "completed":
        product_ids = sorted({item.product_id for item in sale.items}, key=str)
        list(
            session.scalars(
                select(Product.product_id)
                .where(
                    Product.shop_id == shop.shop_id,
                    Product.product_id.in_(product_ids),
                )
                .order_by(Product.product_id)
                .with_for_update()
            )
        )
        movements = {
            movement.sale_item_id: movement
            for movement in session.scalars(
                select(InventoryMovement).where(
                    InventoryMovement.shop_id == shop.shop_id,
                    InventoryMovement.movement_type == "sale",
                    InventoryMovement.sale_item_id.in_(
                        [item.sale_item_id for item in sale.items]
                    ),
                )
            )
        }
        for item in sale.items:
            movement = movements.get(item.sale_item_id)
            if movement is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The sale is missing an inventory movement.",
                )
            session.add(
                InventoryMovement(
                    shop_id=shop.shop_id,
                    product_id=item.product_id,
                    movement_type="reversal",
                    quantity_delta=item.quantity,
                    reverses_movement_id=movement.movement_id,
                    note=f"Voided sale {sale.invoice_number}",
                )
            )

    sale.status = "void"
    session.commit()
    updated_sale = _load_sale(session, shop.shop_id, sale_id)
    return _sale_response(updated_sale)
