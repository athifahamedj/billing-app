from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth import get_shop_context
from app.db.database import get_db
from app.models import Customer, Shop, Supplier
from app.schemas import (
    CustomerResponse,
    CustomerWrite,
    SupplierResponse,
    SupplierWrite,
)

router = APIRouter(prefix="/api", tags=["customers and suppliers"])


def _search_pattern(search: str | None) -> str | None:
    value = search.strip() if search else ""
    if not value:
        return None
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@router.get("/customers", response_model=list[CustomerResponse])
def list_customers(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=100)] = None,
    include_inactive: bool = False,
) -> list[CustomerResponse]:
    query = select(Customer).where(Customer.shop_id == shop.shop_id)
    if not include_inactive:
        query = query.where(Customer.is_active.is_(True))
    pattern = _search_pattern(q)
    if pattern:
        query = query.where(
            or_(
                Customer.name.ilike(pattern, escape="\\"),
                Customer.phone.ilike(pattern, escape="\\"),
                Customer.email.ilike(pattern, escape="\\"),
                Customer.gstin.ilike(pattern, escape="\\"),
            )
        )
    customers = session.scalars(query.order_by(Customer.name, Customer.customer_id))
    return [CustomerResponse.model_validate(customer) for customer in customers]


@router.post(
    "/customers",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
    customer_data: CustomerWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> CustomerResponse:
    customer = Customer(shop_id=shop.shop_id, **customer_data.model_dump())
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: UUID,
    customer_data: CustomerWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> CustomerResponse:
    customer = session.scalar(
        select(Customer).where(
            Customer.customer_id == customer_id,
            Customer.shop_id == shop.shop_id,
            Customer.is_active.is_(True),
        )
    )
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The customer was not found.",
        )
    for field, value in customer_data.model_dump().items():
        setattr(customer, field, value)
    session.commit()
    session.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.delete(
    "/customers/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_customer(
    customer_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> Response:
    customer = session.scalar(
        select(Customer).where(
            Customer.customer_id == customer_id,
            Customer.shop_id == shop.shop_id,
            Customer.is_active.is_(True),
        )
    )
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The customer was not found.",
        )
    customer.is_active = False
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=100)] = None,
    include_inactive: bool = False,
) -> list[SupplierResponse]:
    query = select(Supplier).where(Supplier.shop_id == shop.shop_id)
    if not include_inactive:
        query = query.where(Supplier.is_active.is_(True))
    pattern = _search_pattern(q)
    if pattern:
        query = query.where(
            or_(
                Supplier.name.ilike(pattern, escape="\\"),
                Supplier.phone.ilike(pattern, escape="\\"),
                Supplier.email.ilike(pattern, escape="\\"),
                Supplier.gstin.ilike(pattern, escape="\\"),
            )
        )
    suppliers = session.scalars(query.order_by(Supplier.name, Supplier.supplier_id))
    return [SupplierResponse.model_validate(supplier) for supplier in suppliers]


@router.post(
    "/suppliers",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    supplier_data: SupplierWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> SupplierResponse:
    supplier = Supplier(shop_id=shop.shop_id, **supplier_data.model_dump())
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: UUID,
    supplier_data: SupplierWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> SupplierResponse:
    supplier = session.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.shop_id == shop.shop_id,
            Supplier.is_active.is_(True),
        )
    )
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The supplier was not found.",
        )
    for field, value in supplier_data.model_dump().items():
        setattr(supplier, field, value)
    session.commit()
    session.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.delete(
    "/suppliers/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_supplier(
    supplier_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> Response:
    supplier = session.scalar(
        select(Supplier).where(
            Supplier.supplier_id == supplier_id,
            Supplier.shop_id == shop.shop_id,
            Supplier.is_active.is_(True),
        )
    )
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The supplier was not found.",
        )
    supplier.is_active = False
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
