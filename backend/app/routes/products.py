from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_shop_context
from app.db.database import get_db
from app.models import Product, Shop, User
from app.schemas import ProductResponse, ProductWrite, ShopContextResponse

router = APIRouter(prefix="/api", tags=["shop data"])


@router.get("/shop-context", response_model=ShopContextResponse)
def current_shop_context(
    shop: Annotated[Shop, Depends(get_shop_context)],
    user: Annotated[User, Depends(get_current_user)],
) -> ShopContextResponse:
    return ShopContextResponse(
        shop_id=shop.shop_id,
        shop_name=shop.name,
        role=user.role,
    )


@router.get("/products", response_model=list[ProductResponse])
def list_products(
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=100)] = None,
    include_inactive: bool = False,
) -> list[ProductResponse]:
    query = select(Product).where(Product.shop_id == shop.shop_id)
    if not include_inactive:
        query = query.where(Product.is_active.is_(True))

    search = q.strip() if q else ""
    if search:
        escaped_search = (
            search.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        pattern = f"%{escaped_search}%"
        query = query.where(
            or_(
                Product.name.ilike(pattern, escape="\\"),
                Product.part_number.ilike(pattern, escape="\\"),
                Product.short_name.ilike(pattern, escape="\\"),
                Product.company.ilike(pattern, escape="\\"),
                Product.category.ilike(pattern, escape="\\"),
            )
        )

    products = session.scalars(
        query.order_by(Product.name, Product.part_number)
    )
    return [ProductResponse.model_validate(product) for product in products]


def _commit_product(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        constraint_name = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )
        if constraint_name == "uq_products_shop_part_number":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A product with that part number already exists in this shop.",
            ) from error
        raise


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> ProductResponse:
    product = Product(shop_id=shop.shop_id, **product_data.model_dump())
    session.add(product)
    _commit_product(session)
    session.refresh(product)
    return ProductResponse.model_validate(product)


@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    product_data: ProductWrite,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> ProductResponse:
    product = session.scalar(
        select(Product).where(
            Product.product_id == product_id,
            Product.shop_id == shop.shop_id,
            Product.is_active.is_(True),
        )
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The product was not found.",
        )

    for field, value in product_data.model_dump().items():
        setattr(product, field, value)
    _commit_product(session)
    session.refresh(product)
    return ProductResponse.model_validate(product)


@router.delete(
    "/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_product(
    product_id: UUID,
    shop: Annotated[Shop, Depends(get_shop_context)],
    session: Session = Depends(get_db),
) -> Response:
    product = session.scalar(
        select(Product).where(
            Product.product_id == product_id,
            Product.shop_id == shop.shop_id,
            Product.is_active.is_(True),
        )
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The product was not found.",
        )

    product.is_active = False
    _commit_product(session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
