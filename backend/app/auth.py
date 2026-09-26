import os
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Shop, User

ACCESS_COOKIE_NAME = "billing_access"
ACCESS_TOKEN_LIFETIME = timedelta(hours=8)
TOKEN_ISSUER = "billing-app"


def _secret_key() -> str:
    secret = os.getenv("AUTH_SECRET_KEY")
    if not secret or len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on the server.",
        )
    return secret


def create_access_token(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": now,
            "exp": now + ACCESS_TOKEN_LIFETIME,
            "iss": TOKEN_ISSUER,
        },
        _secret_key(),
        algorithm="HS256",
    )


def get_current_user(
    access_token: Annotated[str | None, Cookie(alias=ACCESS_COOKIE_NAME)] = None,
    session: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
    )
    if access_token is None:
        raise unauthorized

    try:
        claims = jwt.decode(
            access_token,
            _secret_key(),
            algorithms=["HS256"],
            issuer=TOKEN_ISSUER,
            options={"require": ["exp", "iat", "iss", "sub"]},
        )
        user_id = UUID(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError) as error:
        raise unauthorized from error

    user = session.scalar(select(User).where(User.user_id == user_id))
    if user is None or not user.is_active:
        raise unauthorized

    return user


def get_shop_context(
    user: Annotated[User, Depends(get_current_user)],
    session: Session = Depends(get_db),
    requested_shop_id: Annotated[str | None, Header(alias="X-Shop-ID")] = None,
) -> Shop:
    if user.role == "shop_user":
        if user.shop_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user is not assigned to a shop.",
            )
        shop = session.get(Shop, user.shop_id)
        if shop is None or not shop.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The assigned shop is unavailable.",
            )
        return shop

    if requested_shop_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A shop context must be selected.",
        )

    try:
        shop_id = UUID(requested_shop_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected shop ID is invalid.",
        ) from error

    shop = session.get(Shop, shop_id)
    if shop is None or not shop.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The selected shop was not found.",
        )
    return shop
