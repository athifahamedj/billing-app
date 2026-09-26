from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import get_shop_context
from app.db.database import get_db
from app.models import (
    InventoryMovement,
    Product,
    Purchase,
    PurchaseItem,
    Shop,
    Supplier,
)
from app.schemas import (
    InventoryBalanceResponse,
    PurchaseItemResponse,
    PurchaseResponse,
    PurchaseWrite,
)

router = APIRouter(prefix="/api", tags=["purchases and inventory"])
CENT = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _purchase_response(purchase: Purchase) -> PurchaseResponse:
    return PurchaseResponse(
        purchase_id=purchase.purchase_id,
        shop_id=purchase.shop_id,
        supplier_id=purchase.supplier_id,
        supplier_name=purchase.supplier.name,
        invoice_number=purchase.invoice_number,
        purchase_date=purchase.purchase_date,
        subtotal=purchase.subtotal,
        discount_amount=purchase.discount_amount,
        taxable_amount=purchase.taxable_amount,
        gst_amount=purchase.gst_amount,
        total_amount=purchase.total_amount,
        status=purchase.status,
        items=[
            PurchaseItemResponse(
                purchase_item_id=item.purchase_item_id,
                product_id=item.product_id,
                product_name=item.product_name,
                part_number=item.part_number,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_amount=item.discount_amount,
                gst_rate=item.gst_rate,
                gst_amount=item.gst_amount,
            )
            for item in purchase.items
        ],
        created_at=purchase.created_at,
        updated_at=purchase.updated_at,
    )


def _purchase_query(shop_id: UUID):
    return (
        select(Purchase)
        .options(
            selectinload(Purchase.supplier),
            selectinload(Purchase.items),
        )
        .where(Purchase.shop_id == shop_id)
    )


def _handle_purchase_integrity_error(error: IntegrityError) -> None:
    constraint_name = getattr(
        getattr(error.orig, "diag", None),
        "constraint_name",
        None,
    )
    if constraint_name == "uq_purchases_shop_supplier_invoice":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That invoice number already exists for this supplier.",
        ) from error
    raise error


@router.get("/purchases", response_model=list[PurchaseResponse])
def list_purchases(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> list[PurchaseResponse]:
    query = _purchase_query(shop.shop_id)
    search = q.strip() if q else ""
    if search:
        escaped = (
            search.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"%{escaped}%"
        query = query.join(Supplier).where(
            or_(
                Purchase.invoice_number.ilike(pattern, escape="\\"),
                Supplier.name.ilike(pattern, escape="\\"),
            )
        )
    purchases = session.scalars(
        query.order_by(Purchase.purchase_date.desc(), Purchase.created_at.desc())
    )
    return [_purchase_response(purchase) for purchase in purchases]


@router.post(
    "/purchases",
    response_model=PurchaseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase(
    purchase_data: PurchaseWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> PurchaseResponse:
    supplier = session.scalar(
        select(Supplier).where(
            Supplier.supplier_id == purchase_data.supplier_id,
            Supplier.shop_id == shop.shop_id,
            Supplier.is_active.is_(True),
        )
    )
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The supplier was not found.",
        )

    requested_product_ids = [item.product_id for item in purchase_data.items]
    products = {
        product.product_id: product
        for product in session.scalars(
            select(Product).where(
                Product.shop_id == shop.shop_id,
                Product.product_id.in_(requested_product_ids),
                Product.is_active.is_(True),
            )
        )
    }
    if len(products) != len(requested_product_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more products are unavailable in this shop.",
        )

    subtotal = Decimal("0")
    total_discount = Decimal("0")
    taxable_amount = Decimal("0")
    gst_amount = Decimal("0")
    prepared_items = []
    for item_data in purchase_data.items:
        line_subtotal = _money(item_data.unit_price * item_data.quantity)
        if item_data.discount_amount > line_subtotal:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A line discount cannot exceed its subtotal.",
            )
        line_taxable = line_subtotal - item_data.discount_amount
        line_gst = _money(line_taxable * item_data.gst_rate / Decimal("100"))
        subtotal += line_subtotal
        total_discount += item_data.discount_amount
        taxable_amount += line_taxable
        gst_amount += line_gst
        product = products[item_data.product_id]
        prepared_items.append(
            PurchaseItem(
                shop_id=shop.shop_id,
                product_id=product.product_id,
                product_name=product.name,
                part_number=product.part_number,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_amount=item_data.discount_amount,
                gst_rate=item_data.gst_rate,
                gst_amount=line_gst,
            )
        )

    purchase = Purchase(
        shop_id=shop.shop_id,
        supplier_id=supplier.supplier_id,
        invoice_number=purchase_data.invoice_number,
        purchase_date=purchase_data.purchase_date,
        subtotal=subtotal,
        discount_amount=total_discount,
        taxable_amount=taxable_amount,
        gst_amount=gst_amount,
        total_amount=taxable_amount + gst_amount,
        status="draft",
    )
    purchase.items = prepared_items
    session.add(purchase)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        _handle_purchase_integrity_error(error)
    purchase = session.scalar(
        _purchase_query(shop.shop_id).where(
            Purchase.purchase_id == purchase.purchase_id
        )
    )
    return _purchase_response(purchase)


@router.post(
    "/purchases/{purchase_id}/receive",
    response_model=PurchaseResponse,
)
def receive_purchase(
    purchase_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> PurchaseResponse:
    purchase = session.scalar(
        _purchase_query(shop.shop_id)
        .where(Purchase.purchase_id == purchase_id)
        .with_for_update()
    )
    if purchase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The purchase was not found.",
        )
    if purchase.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a draft purchase can be received.",
        )
    if not purchase.items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A purchase must contain items before it can be received.",
        )

    for item in purchase.items:
        session.add(
            InventoryMovement(
                shop_id=shop.shop_id,
                product_id=item.product_id,
                movement_type="purchase",
                quantity_delta=item.quantity,
                purchase_item_id=item.purchase_item_id,
                note=f"Received purchase {purchase.invoice_number}",
            )
        )
    purchase.status = "received"
    session.commit()
    session.refresh(purchase)
    return _purchase_response(purchase)


@router.post(
    "/purchases/{purchase_id}/void",
    response_model=PurchaseResponse,
)
def void_purchase(
    purchase_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> PurchaseResponse:
    purchase = session.scalar(
        _purchase_query(shop.shop_id)
        .where(Purchase.purchase_id == purchase_id)
        .with_for_update()
    )
    if purchase is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The purchase was not found.",
        )
    if purchase.status == "void":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The purchase is already void.",
        )

    if purchase.status == "received":
        product_ids = sorted({item.product_id for item in purchase.items}, key=str)
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
        stock_by_product = dict(
            session.execute(
                select(
                    InventoryMovement.product_id,
                    func.coalesce(func.sum(InventoryMovement.quantity_delta), 0),
                )
                .where(
                    InventoryMovement.shop_id == shop.shop_id,
                    InventoryMovement.product_id.in_(product_ids),
                )
                .group_by(InventoryMovement.product_id)
            ).all()
        )
        movements = {
            movement.purchase_item_id: movement
            for movement in session.scalars(
                select(InventoryMovement).where(
                    InventoryMovement.shop_id == shop.shop_id,
                    InventoryMovement.movement_type == "purchase",
                    InventoryMovement.purchase_item_id.in_(
                        [item.purchase_item_id for item in purchase.items]
                    ),
                )
            )
        }
        for item in purchase.items:
            movement = movements.get(item.purchase_item_id)
            if movement is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="The purchase is missing an inventory movement.",
                )
            if stock_by_product.get(item.product_id, 0) < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "This purchase cannot be voided because some received "
                        "stock has already been used. Reconcile inventory first."
                    ),
                )
            session.add(
                InventoryMovement(
                    shop_id=shop.shop_id,
                    product_id=item.product_id,
                    movement_type="reversal",
                    quantity_delta=-item.quantity,
                    reverses_movement_id=movement.movement_id,
                    note=f"Voided purchase {purchase.invoice_number}",
                )
            )

    purchase.status = "void"
    session.commit()
    session.refresh(purchase)
    return _purchase_response(purchase)


@router.get("/inventory", response_model=list[InventoryBalanceResponse])
def list_inventory(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> list[InventoryBalanceResponse]:
    query = (
        select(
            Product.product_id,
            Product.name,
            Product.part_number,
            Product.unit,
            func.coalesce(func.sum(InventoryMovement.quantity_delta), 0),
        )
        .outerjoin(
            InventoryMovement,
            (InventoryMovement.shop_id == Product.shop_id)
            & (InventoryMovement.product_id == Product.product_id),
        )
        .where(Product.shop_id == shop.shop_id)
        .group_by(Product.product_id)
    )
    search = q.strip() if q else ""
    if search:
        escaped = (
            search.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"%{escaped}%"
        query = query.where(
            or_(
                Product.name.ilike(pattern, escape="\\"),
                Product.part_number.ilike(pattern, escape="\\"),
                Product.short_name.ilike(pattern, escape="\\"),
            )
        )

    return [
        InventoryBalanceResponse(
            product_id=product_id,
            name=name,
            part_number=part_number,
            unit=unit,
            quantity_on_hand=quantity_on_hand,
        )
        for product_id, name, part_number, unit, quantity_on_hand in session.execute(
            query.order_by(Product.name, Product.part_number)
        )
    ]
