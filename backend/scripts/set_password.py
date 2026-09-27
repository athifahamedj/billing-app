import getpass

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import User

MINIMUM_PASSWORD_LENGTH = 4


def set_user_password(
    session: Session,
    username: str,
    password: str,
) -> str:
    normalized_username = username.strip().lower()
    user = session.scalar(
        select(User).where(User.username == normalized_username)
    )
    if user is None:
        raise ValueError(f"No account found for username {normalized_username!r}.")
    if not user.is_active:
        raise ValueError(
            f"Account {normalized_username!r} is inactive; password was not changed."
        )
    if len(password) < MINIMUM_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must contain at least {MINIMUM_PASSWORD_LENGTH} characters."
        )

    user.password_hash = PasswordHash.recommended().hash(password)
    session.flush()
    return user.username


def main() -> None:
    username = input("Username [admin123]: ").strip() or "admin123"
    password = getpass.getpass("New password: ")
    confirmation = getpass.getpass("Confirm new password: ")

    if password != confirmation:
        raise SystemExit("Passwords do not match; password was not changed.")

    try:
        with SessionLocal.begin() as session:
            updated_username = set_user_password(session, username, password)
    except ValueError as error:
        raise SystemExit(str(error)) from error

    print(f"Password updated for {updated_username}. You can now log in.")


if __name__ == "__main__":
    main()
