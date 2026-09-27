import getpass

from pwdlib import PasswordHash
from sqlalchemy import select

from app.db.database import SessionLocal
from app.models import User


def main() -> None:
    username = input("Username [super-admin]: ").strip().lower() or "super-admin"
    display_name = input("Display name: ").strip()
    password = getpass.getpass("Password (minimum 4 characters): ")
    password_confirmation = getpass.getpass("Confirm password: ")

    if not username or not display_name:
        raise SystemExit("Username and display name are required.")
    if len(password) < 4:
        raise SystemExit("Password must contain at least 4 characters.")
    if password != password_confirmation:
        raise SystemExit("Passwords do not match.")

    with SessionLocal.begin() as session:
        existing_user = session.scalar(
            select(User).where(User.username == username)
        )
        if existing_user is not None:
            raise SystemExit("That username is already in use.")

        user = User(
            username=username,
            password_hash=PasswordHash.recommended().hash(password),
            display_name=display_name,
            role="super_admin",
            shop_id=None,
        )
        session.add(user)
        session.flush()
        print(f"Created super admin {user.username}.")


if __name__ == "__main__":
    main()
