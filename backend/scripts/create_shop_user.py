import getpass

from pwdlib import PasswordHash
from sqlalchemy import select

from app.db.database import SessionLocal
from app.models import Shop, User


def main() -> None:
    shop_slug = input("Shop slug [manar-motors]: ").strip() or "manar-motors"
    username = input("Username: ").strip().lower()
    display_name = input("Display name: ").strip()
    password = getpass.getpass("Password (minimum 12 characters): ")
    password_confirmation = getpass.getpass("Confirm password: ")

    if not username or not display_name:
        raise SystemExit("Username and display name are required.")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters.")
    if password != password_confirmation:
        raise SystemExit("Passwords do not match.")

    with SessionLocal.begin() as session:
        shop = session.scalar(select(Shop).where(Shop.slug == shop_slug))
        if shop is None:
            raise SystemExit(f"No shop found with slug {shop_slug!r}.")

        existing_user = session.scalar(
            select(User).where(User.username == username)
        )
        if existing_user is not None:
            raise SystemExit("That username is already in use.")

        user = User(
            username=username,
            password_hash=PasswordHash.recommended().hash(password),
            display_name=display_name,
            role="shop_user",
            shop=shop,
        )
        session.add(user)
        session.flush()
        print(f"Created shop user {user.username} for {shop.name}.")


if __name__ == "__main__":
    main()
