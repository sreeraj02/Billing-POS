# POS Billing Software

## Description

A Point-of-Sale and billing system for a textile / retail shop. Admins manage products, staff, suppliers, returns, the
ledger and reports; billing staff use a fast POS screen to create bills, take payment and print invoices. The whole
Admin Portal is also available in a mobile-app style layout at `/mobile-admin`.

The backend is the source of truth: checkout and returns run inside database transactions with row locking, so stock
can never go negative and a failed bill never leaves partial data behind.

## Features

### Admin Portal
- Dashboard: today's sales & bills, product counts, low-stock list, recent bills, 7-day trend (all from the database)
- Product CRUD (SKU, barcode, purchase/selling price, stock, reorder level, active flag, low-stock detection)
- Category CRUD
- Staff management (create, edit, reset password, activate/deactivate, delete)
- Supplier management with a per-supplier payable ledger (purchases / payments)
- Product returns against an existing bill (cannot return more than sold, stock is restored, refund is recorded)
- Bills / transactions with search, date and payment filters, and reprint
- Sales ledger (credits for sales, debits for refunds) and sales report (bills, sales, discounts, average bill,
  returns, net sales, payment-method split, top products, daily sales)

### Billing Portal
- Product search (name / SKU / barcode), tap to add, quantity +/-, remove item
- Customer name and phone, discount, payment method (Cash / Card / UPI / Mixed), paid amount and change
- Checkout creates the invoice, reduces stock and writes the ledger in one transaction
- Printable invoice (`window.print()` with print-only styles) and reprint from the Bills page
- Staff only see their own bills and cannot open admin pages

### Mobile Admin UI
- `/mobile-admin` shows **every admin page** in an app-style shell: top app bar, drawer menu, bottom tab bar
- On a desktop browser it is shown inside a phone frame; on a real phone it fills the screen
- Tables turn into cards and forms stack on narrow screens (CSS container queries)

## Technology Stack

Backend:
- Python, Django, Django REST Framework
- Simple JWT (access + refresh tokens)
- SQLite by default (switchable to PostgreSQL through `DATABASE_URL`)
- django-cors-headers, drf-spectacular (Swagger / OpenAPI), WhiteNoise, Gunicorn

Frontend:
- React 18 + Vite
- Axios (with token refresh interceptor)
- React Router
- Plain CSS

## Project Structure

```
Billing/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/          settings, root urls, wsgi/asgi
│   ├── accounts/        custom User (ADMIN/STAFF), JWT login/refresh/me, staff API, permissions, seed_demo command
│   ├── inventory/       Category, Product (SKU, barcode, prices, stock, reorder level)
│   ├── suppliers/       Supplier, SupplierLedger
│   └── sales/           Sale, SaleItem, Return, ReturnItem, SalesLedger, checkout/return services, reports, dashboard
├── frontend/
│   ├── package.json, index.html, vite.config.js
│   └── src/
│       ├── api/         axios client + error formatting
│       ├── context/     auth and toast providers
│       ├── components/  shells (desktop + mobile), modal, table, invoice
│       └── pages/       Login, Dashboard, Billing, Bills, Products, Categories, Staff, Suppliers, Returns, Ledger, Reports
├── README.md
└── .gitignore
```

## Installation

### Backend installation

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows      (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt

python manage.py makemigrations accounts inventory suppliers sales
python manage.py migrate
python manage.py seed_demo       # demo users, category, products, supplier
python manage.py runserver
```

Commit the generated `*/migrations/0001_initial.py` files so others get the same schema.

Optional: set the variables from `.env.example` in your environment (`SECRET_KEY`, `DEBUG`, `DATABASE_URL`,
`CORS_ALLOWED_ORIGINS`, ...). Nothing is required for local development.

### Frontend installation

```bash
cd frontend
npm install
copy .env.example .env           # macOS/Linux: cp .env.example .env
npm run dev
```

## API Documentation

Swagger UI: http://127.0.0.1:8000/api/docs/  ·  OpenAPI schema: http://127.0.0.1:8000/api/schema/

In Swagger, call `POST /api/auth/login/`, copy the **access** token and paste it in *Authorize* (Bearer / jwtAuth).
Do not use the refresh token there.

## Test Credentials

Created by `python manage.py seed_demo`:

Admin:
- username: `admin`
- password: `Admin@123`

Staff:
- username: `staff1`
- password: `Staff@123`

(If an `admin` user already exists the seed command keeps its current password.)

## URLs

Backend: http://127.0.0.1:8000/

Swagger: http://127.0.0.1:8000/api/docs/

Django admin: http://127.0.0.1:8000/admin/

Frontend: http://localhost:5173/

Mobile Admin: http://localhost:5173/mobile-admin

## API Endpoints

| Area | Endpoint | Access |
| --- | --- | --- |
| Auth | `POST /api/auth/login/`, `POST /api/auth/refresh/`, `GET /api/auth/me/` | public / signed-in |
| Staff | `GET, POST /api/auth/staff/` · `GET, PATCH, DELETE /api/auth/staff/<id>/` | admin |
| Categories | `GET, POST /api/inventory/categories/` · `GET, PATCH, DELETE .../<id>/` | read: signed-in, write: admin |
| Products | `GET, POST /api/inventory/products/` · `GET, PATCH, DELETE .../<id>/` (`?search=&category=&active=&low_stock=`) | read: signed-in, write: admin |
| Suppliers | `GET, POST /api/suppliers/suppliers/` · `GET, PATCH, DELETE .../<id>/` | admin |
| Supplier ledger | `GET, POST /api/suppliers/ledger/` (`?supplier=`) | admin |
| Checkout | `POST /api/sales/checkout/` | signed-in |
| Bills | `GET /api/sales/bills/`, `GET /api/sales/bills/<id>/` | admin: all, staff: own |
| Returns | `GET /api/sales/returns/`, `POST /api/sales/returns/create/` | admin |
| Sales ledger | `GET /api/sales/ledger/` | admin |
| Reports | `GET /api/sales/reports/sales/` (`?date_from=&date_to=`) | admin |
| Dashboard | `GET /api/sales/dashboard/` | admin |

Checkout request:

```json
{
  "items": [{ "product_id": 1, "quantity": 2 }],
  "customer_name": "Customer",
  "customer_phone": "9999999999",
  "discount": 0,
  "payment_method": "CASH",
  "paid_amount": 2000
}
```

## Deployment

- **Backend (Render / Railway):** root directory `backend`, build command `./build.sh`, start command
  `gunicorn config.wsgi`. Set `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` (your frontend URL) and
  `CSRF_TRUSTED_ORIGINS`. For persistent data set `DATABASE_URL` to a PostgreSQL URL and uncomment `psycopg` in
  `requirements.txt`. SQLite on a free host is wiped on every deploy; `build.sh` re-seeds the demo data.
- **Frontend (Vercel / Netlify):** root directory `frontend`, build `npm run build`, output `dist`, and set
  `VITE_API_URL=https://<your-backend>/api`. `vercel.json` and `public/_redirects` make `/mobile-admin` work as a direct link.

## Assumptions

- Two roles: **Admin** (everything) and **Staff** (billing portal and their own bills). Roles are enforced in the API;
  hiding menu items in the UI is only a convenience.
- Prices are in INR and tax is not modelled (invoices show subtotal, discount and total).
- The paid amount must cover the total; any excess is shown as change to return.
- Returns are handled by admins and refund at the price actually paid (a bill discount is shared proportionally).
- Staff who already created bills cannot be hard-deleted; they are deactivated to keep the audit trail.
- Products that were sold cannot be deleted; mark them inactive instead.
- Supplier ledger: credit = purchase / bill received, debit = payment made; payable = opening balance + credits - debits.
- List endpoints are not paginated (fine for a demo-sized dataset).

## Future Improvements

- Purchase orders that increase product stock and post to the supplier ledger automatically
- GST / tax handling, barcode-scanner input and thermal-printer receipts
- Pagination, CSV/PDF export of reports, automated tests and CI
- Refresh-token rotation/blacklisting and httpOnly-cookie token storage
