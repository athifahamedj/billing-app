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

Create a global super-admin account:

```powershell
.\venv\Scripts\python.exe -m scripts.create_super_admin
```

The script asks for the shop slug, username, display name, and password.
Password input is hidden and passwords are stored only as Argon2 hashes.
Usernames are unique across all shops.

Set a private signing key before starting the API. For a development session,
generate one in the same PowerShell window:

```powershell
$env:AUTH_SECRET_KEY = (& .\venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))").Trim()
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

For persistent local development, store `AUTH_SECRET_KEY` in the ignored
`backend/.env` file. Do not commit it. Production must also set
`AUTH_COOKIE_SECURE=true` and serve the app over HTTPS.
For the Vite development server, configure
`CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` in
`backend/.env`. Add only the exact frontend origins used by your deployment;
API writes require both an allowed `Origin` and the CSRF marker header.

The database has a UUID `shop_id` for each shop. A regular shop user belongs
to exactly one shop. Super-admin accounts have a global role and do not store
a shop association and can select any active shop.
All 12 approved application tables are represented in SQLAlchemy models and
Alembic migrations. Authentication and tenant-scoped Products, Customers, and
Suppliers CRUD are available under `/api`. Purchases are saved as drafts, then
explicitly received to add stock through inventory movements. Drafts can be
voided without a stock change. Received purchases are immutable; voiding one
posts reversal movements only when existing on-hand stock covers the reversal.
On-hand stock is calculated from movement history at `GET /api/inventory`.
All API writes require a same-origin or explicitly trusted `Origin` and the
frontend's `X-CSRF-Protection` header.

Sales are completed as one transaction: the API prices active products using
their configured selling price and GST, checks and locks available stock,
records sale items, and posts negative inventory movements. A sale can have no
payment (credit), one payment, or multiple payments using cash, UPI, card, bank
transfer, cheque, or other. Payments are tied to one sale; paid and outstanding
amounts and payment status are derived from non-void payments. Additional
payments cannot exceed the outstanding balance. To void a sale, first reverse
each recorded payment; the sale void then posts positive stock-reversal
movements to restore the sold quantities.
Sales and payments are shop-scoped and use the same CSRF protection as other
write endpoints.

Seed the 15 starter products in `scripts/data/products.json` into Manar Motors
once, or rerun safely to skip existing part numbers:

```powershell
.\venv\Scripts\python.exe -m scripts.seed_products
```

Run the rollback-only two-shop integration tests from this directory:

```powershell
.\venv\Scripts\python.exe -m unittest -v tests.test_auth
```
