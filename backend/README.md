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

After signing in as a super admin, use **Set up shop** in the application menu
to create a shop and its first shop-user login together. New shops appear in
the shop selector immediately. Public shop registration is not enabled.
Use **Shop logins** to change a shop user's username or set a new password.
Use **Manage shops** to permanently remove a closed shop and all its
shop-scoped data. This cannot be undone; existing database backups may still
contain older copies.
**Shop logins** also lets a signed-in super admin update their own login. The
interactive `scripts.create_super_admin` command defaults its username to
`super-admin`; existing super-admin credentials are not changed automatically.

Reset an existing account's password without displaying or storing it in
plain text:

```powershell
.\venv\Scripts\python.exe -m scripts.set_password
```

Enter the username (or accept the `admin123` default), then enter and confirm a
new password at the hidden prompts. This updates only that account's password
hash; it does not create an account or change its role or shop.

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

Payments can also be recorded against received purchases using the supported
payment methods. Supplier balances are derived from received, non-void
purchases and their recorded payments at
`GET /api/suppliers/{supplier_id}/ledger`. Payments cannot exceed the purchase
balance. Reverse recorded supplier payments before voiding a purchase; purchase
voiding still checks that enough stock remains to reverse its receipt.

Sales are completed as one transaction: the API prices active products using
their configured selling price and GST, checks and locks available stock,
records sale items, and posts negative inventory movements. A sale can have no
payment (credit), one payment, or multiple payments using cash, UPI, card, bank
transfer, cheque, or other. Payments are tied to one sale; paid and outstanding
amounts and payment status are derived from non-void payments. Additional
payments cannot exceed the outstanding balance. To void a sale, first reverse
each recorded payment; the sale void then posts positive stock-reversal
movements to restore the sold quantities.
Completed and void sale invoices are available from the shop-scoped
`GET /api/sales/{sale_id}/invoice` endpoint and can be printed or saved as PDF
from the Sales page.
Sales and payments are shop-scoped and use the same CSRF protection as other
write endpoints.

The dashboard summary is available at `GET /api/dashboard/summary` and shows
today's completed sales, the five most recent completed sales, and active
products with five or fewer units on hand. Date-range reports are available at
`GET /api/reports/summary?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`. Sales and
received purchases are grouped by invoice date; recorded payment totals use
payment date. Customer and supplier outstanding figures are current all-time
balances. Dashboard and report queries are scoped to the selected shop.
Shop settings load and save through `GET /api/settings` and `PUT /api/settings`.
Business name, phone, address, and GSTIN update the selected shop profile;
billing, invoice-display, inventory-alert, and invoice-prefix preferences are
stored in that shop's existing `shop_settings` record. Settings writes use the
same CSRF and shop-isolation protections as other writes.

Seed the 15 starter products in `scripts/data/products.json` into Manar Motors
once, or rerun safely to skip existing part numbers:

```powershell
.\venv\Scripts\python.exe -m scripts.seed_products
```

The reviewed full catalog can be imported separately. Supply the source path;
the default command is a dry run. Review its counts before adding `--apply` to
commit. This importer is fixed to Manar Motors, updates matching catalog fields
without changing activation state, and never creates stock or inventory
movements. It ignores the spreadsheet's `Cost` field and uses `Purchase Rate`
for `purchase_price`.

```powershell
$catalogPath = Read-Host "Path to the reviewed product catalog"
.\venv\Scripts\python.exe -m scripts.import_product_catalog $catalogPath
.\venv\Scripts\python.exe -m scripts.import_product_catalog $catalogPath --apply
```

Run the rollback-only two-shop integration tests from this directory:

```powershell
.\venv\Scripts\python.exe -m unittest -v tests.test_auth
```

## Production launch checklist

- Store `DATABASE_URL`, `AUTH_SECRET_KEY`, `AUTH_COOKIE_SECURE=true`, and the
  exact HTTPS frontend origins in the deployment platform's secret manager.
  Never reuse the example key or commit a populated `.env` file.
- Serve the frontend and API on the same site, preferably with the frontend
  proxying `/api` to the API. If a reverse proxy terminates TLS, forward the
  original scheme in `X-Forwarded-Proto`.
- Build the frontend with `npm run build`. Configure the static host to serve
  the SPA entry point for application routes.
- Take a verified database backup, then run
  `.\venv\Scripts\python.exe -m alembic upgrade head` once as a release
  migration step before starting the API workers. Do not run migrations from
  every worker's startup hook.
- Configure the platform's readiness probe to request `GET /health`. It
  returns `{"status":"ok"}` only after the database connection succeeds.
- Run a two-shop login, tenant-isolation, invoice-print, and payment-reversal
  smoke test against staging before releasing.
- Schedule encrypted PostgreSQL backups outside the application host, monitor
  backup success, and periodically verify restoration into a separate
  non-production database.

For a manual PowerShell backup, set `DATABASE_URL` from the deployment
secret manager and choose a protected backup destination:

```powershell
$env:BACKUP_FILE = "D:\protected-backups\billing.dump"
pg_dump --format=custom --file=$env:BACKUP_FILE $env:DATABASE_URL
```

Restore only into a disposable or explicitly approved target database; the
`--clean` option removes existing objects in that target:

```powershell
# Set RESTORE_DATABASE_URL to the approved restore target from the secret manager.
pg_restore --clean --if-exists --dbname=$env:RESTORE_DATABASE_URL $env:BACKUP_FILE
```

Provider-specific deployment resources and production credentials are not
configured in this repository. Select a hosting provider and provision its
database, secret storage, TLS, and backup retention before public launch.
