# Backend setup

Run commands from the `backend` directory in PowerShell.

Apply database migrations and make sure the Manar Motors shop exists:

```powershell
.\venv\Scripts\python.exe -m alembic upgrade head
.\venv\Scripts\python.exe -m scripts.seed_shop
```

Create a login account for a shop:

```powershell
.\venv\Scripts\python.exe -m scripts.create_shop_user
```

The script asks for the shop slug, username, display name, and password.
Password input is hidden and passwords are stored only as Argon2 hashes.
Usernames are unique across all shops.

The database has a UUID `shop_id` for each shop. A regular shop user belongs
to exactly one shop. Super-admin accounts have a global role and do not store
a shop association; login and authorization endpoints have not been implemented.
Product import is also a separate next step.
