from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db.database import get_db
from app.models import (
    Customer,
    InventoryMovement,
    Payment,
    Product,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    Shop,
    ShopSetting,
    Supplier,
    User,
)
from app.schemas import (
    AdminUsernameResponse,
    ShopDeleteConfirmation,
    ShopResponse,
    ShopSetupWrite,
    ShopUserCredentialsWrite,
    ShopUserResponse,
)

router = APIRouter(prefix="/api/admin", tags=["administration"])
password_hasher = PasswordHash.recommended()


def _require_super_admin(user: User) -> None:
    if user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a super admin can manage shops and shop logins.",
        )


@router.put(
    "/me/credentials",
    response_model=AdminUsernameResponse,
)
def update_super_admin_credentials(
    credentials: ShopUserCredentialsWrite,
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> AdminUsernameResponse:
    _require_super_admin(user)
    if credentials.username is None and credentials.password is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a new username or a new password.",
        )

    if credentials.username is not None:
        user.username = credentials.username
    if credentials.password is not None:
        user.password_hash = password_hasher.hash(credentials.password)

    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        constraint_name = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )
        if constraint_name == "uq_users_username":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That username is already in use.",
            ) from error
        raise

    session.refresh(user)
    return AdminUsernameResponse(username=user.username)


@router.get("/shop-users", response_model=list[ShopUserResponse])
def list_shop_users(
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> list[ShopUserResponse]:
    _require_super_admin(user)
    shop_users = session.scalars(
        select(User)
        .join(Shop, User.shop_id == Shop.shop_id)
        .where(
            User.role == "shop_user",
            User.is_active.is_(True),
            Shop.is_active.is_(True),
        )
        .order_by(Shop.name, User.display_name, User.username)
    )
    return [
        ShopUserResponse(
            user_id=shop_user.user_id,
            username=shop_user.username,
            display_name=shop_user.display_name,
            shop_id=shop_user.shop_id,
            shop_name=shop_user.shop.name,
        )
        for shop_user in shop_users
    ]


@router.put(
    "/shop-users/{user_id}/credentials",
    response_model=ShopUserResponse,
)
def update_shop_user_credentials(
    user_id: UUID,
    credentials: ShopUserCredentialsWrite,
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> ShopUserResponse:
    _require_super_admin(user)
    if credentials.username is None and credentials.password is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a new username or a new password.",
        )

    shop_user = session.scalar(
        select(User)
        .join(Shop, User.shop_id == Shop.shop_id)
        .where(
            User.user_id == user_id,
            User.role == "shop_user",
            User.is_active.is_(True),
            Shop.is_active.is_(True),
        )
    )
    if shop_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The active shop login was not found.",
        )

    if credentials.username is not None:
        shop_user.username = credentials.username
    if credentials.password is not None:
        shop_user.password_hash = password_hasher.hash(credentials.password)

    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        constraint_name = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )
        if constraint_name == "uq_users_username":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That username is already in use.",
            ) from error
        raise

    session.refresh(shop_user)
    return ShopUserResponse(
        user_id=shop_user.user_id,
        username=shop_user.username,
        display_name=shop_user.display_name,
        shop_id=shop_user.shop_id,
        shop_name=shop_user.shop.name,
    )


@router.post(
    "/shops",
    response_model=ShopResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_shop(
    setup: ShopSetupWrite,
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> ShopResponse:
    _require_super_admin(user)

    if session.scalar(select(Shop.shop_id).where(Shop.slug == setup.slug)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A shop with that web address already exists.",
        )
    if session.scalar(select(User.user_id).where(User.username == setup.username)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already in use.",
        )

    shop = Shop(
        name=setup.name,
        slug=setup.slug,
        phone=setup.phone or None,
        address=setup.address or None,
        gstin=setup.gstin or None,
    )
    shop_user = User(
        username=setup.username,
        password_hash=password_hasher.hash(setup.password),
        display_name=setup.display_name,
        role="shop_user",
        shop=shop,
    )
    session.add_all([shop, shop_user])

    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        constraint_name = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )
        if constraint_name in {"shops_slug_key", "uq_users_username"}:
            detail = (
                "A shop with that web address already exists."
                if constraint_name == "shops_slug_key"
                else "That username is already in use."
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=detail,
            ) from error
        raise

    session.refresh(shop)
    return ShopResponse(
        shop_id=shop.shop_id,
        name=shop.name,
        slug=shop.slug,
    )


@router.delete(
    "/shops/{shop_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_shop(
    shop_id: UUID,
    confirmation: ShopDeleteConfirmation,
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> Response:
    _require_super_admin(user)

    shop = session.scalar(
        select(Shop)
        .where(Shop.shop_id == shop_id)
        .with_for_update()
    )
    if shop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The shop was not found.",
        )
    if confirmation.slug != shop.slug:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter the shop short name exactly to confirm deletion.",
        )

    session.execute(
        delete(InventoryMovement).where(
            InventoryMovement.shop_id == shop_id,
            InventoryMovement.movement_type == "reversal",
        )
    )
    session.execute(
        delete(InventoryMovement).where(InventoryMovement.shop_id == shop_id)
    )
    session.execute(delete(Payment).where(Payment.shop_id == shop_id))
    session.execute(delete(SaleItem).where(SaleItem.shop_id == shop_id))
    session.execute(delete(PurchaseItem).where(PurchaseItem.shop_id == shop_id))
    session.execute(delete(Sale).where(Sale.shop_id == shop_id))
    session.execute(delete(Purchase).where(Purchase.shop_id == shop_id))
    session.execute(delete(Customer).where(Customer.shop_id == shop_id))
    session.execute(delete(Supplier).where(Supplier.shop_id == shop_id))
    session.execute(delete(Product).where(Product.shop_id == shop_id))
    session.execute(delete(ShopSetting).where(ShopSetting.shop_id == shop_id))
    session.execute(
        delete(User).where(
            User.shop_id == shop_id,
            User.role == "shop_user",
        )
    )
    session.delete(shop)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
