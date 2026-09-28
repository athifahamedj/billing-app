import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import (
    ACCESS_COOKIE_NAME,
    ACCESS_TOKEN_LIFETIME,
    create_access_token,
    get_current_user,
)
from app.db.database import get_db
from app.models import Shop, User
from app.schemas import LoginRequest, ShopResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["authentication"])

password_hasher = PasswordHash.recommended()
_dummy_password_hash = password_hasher.hash("invalid-account-password")


def _secure_cookie_enabled() -> bool:
    return os.getenv("AUTH_COOKIE_SECURE", "true").lower() in {
        "true",
        "1",
        "yes",
    }


def _user_response(user: User, shop: Shop | None) -> UserResponse:
    return UserResponse(
        user_id=user.user_id,
        username=user.username,
        display_name=user.display_name,
        role=user.role,
        shop_id=user.shop_id,
        shop_name=shop.name if shop else None,
    )


@router.post("/login", response_model=UserResponse)
def login(
    credentials: LoginRequest,
    response: Response,
    session: Session = Depends(get_db),
) -> UserResponse:
    username = credentials.username.strip().lower()

    user = session.scalar(
        select(User).where(User.username == username)
    )

    password_hash = (
        user.password_hash
        if user
        else _dummy_password_hash
    )

    if not password_hasher.verify(
        credentials.password,
        password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    shop = (
        session.get(Shop, user.shop_id)
        if user.shop_id
        else None
    )

    if user.role == "shop_user" and (
        shop is None or not shop.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    secure_cookie = _secure_cookie_enabled()

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=create_access_token(user.user_id),
        max_age=int(ACCESS_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=secure_cookie,
        samesite="none" if secure_cookie else "lax",
        path="/api",
    )

    return _user_response(user, shop)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    secure_cookie = _secure_cookie_enabled()

    response.delete_cookie(
        key=ACCESS_COOKIE_NAME,
        httponly=True,
        secure=secure_cookie,
        samesite="none" if secure_cookie else "lax",
        path="/api",
    )


@router.get("/me", response_model=UserResponse)
def current_user(
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> UserResponse:
    shop = (
        session.get(Shop, user.shop_id)
        if user.shop_id
        else None
    )

    return _user_response(user, shop)


@router.get("/shops", response_model=list[ShopResponse])
def accessible_shops(
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
) -> list[ShopResponse]:
    query = (
        select(Shop)
        .where(Shop.is_active.is_(True))
        .order_by(Shop.name)
    )

    if user.role == "shop_user":
        if user.shop_id is None:
            return []

        query = query.where(
            Shop.shop_id == user.shop_id
        )

    return [
        ShopResponse(
            shop_id=shop.shop_id,
            name=shop.name,
            slug=shop.slug,
        )
        for shop in session.scalars(query)
    ]