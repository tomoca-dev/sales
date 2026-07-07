# TOMOCA Supabase Setup

## 1. Install the schema

Open the Supabase project, select **SQL Editor**, paste the full contents of `supabase_tomoca_schema.sql`, and run it. The script is safe to run on a project that used the earlier TOMOCA schema: it updates the role constraint and adds missing columns/tables.

Main tables:

- `profiles`: authenticated user names, roles, and balances;
- `tomoca_platform_entities`: persistent operational records used across all modules;
- `sales_document_imports`: PDF/image import status, extracted document JSON, duplicate hash, linked order, errors, and importing user;
- `imports` and `state_snapshots`: retained for backward compatibility.

## 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_PUBLIC_KEY"
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_SECRET_KEY"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

`VITE_SUPABASE_ANON_KEY` is browser-safe. `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are server-only secrets and must never be committed or placed in client code.

## 3. Create users and assign roles

Public signup creates a `Customer` profile. This prevents a browser user from promoting themselves to Admin or Management. Assign internal staff roles from the Supabase `profiles` table using a trusted administrator account or SQL Editor.

Allowed roles:

- Sales Rep
- Admin
- Payment Collector
- Factory/Ops
- Marketing
- Management
- Customer
- Driver

Example trusted role assignment:

```sql
update public.profiles
set role = 'Management'
where email = 'manager@example.com';
```

## 4. No mock or seed data

The server never inserts starter products, orders, branches, inventory, drivers, zones, customers, or analytics. With an empty Supabase project, business pages intentionally remain empty.

Create real master data from the management pages before placing application orders. A historical sales PDF can be imported without a product catalog because its visible line items are stored as imported sales lines. Select a real branch during review when the document should affect branch KPIs.

## 5. Sales Board PDF workflow

1. Open **Sales Board** and select **Import**.
2. Upload a PDF/image or supported office file.
3. The server processes the real file with Gemini. Image-only scanned PDFs are supported.
4. Review every extracted customer, transaction, reference, line-item, VAT, and total field.
5. Correct uncertain values and select the payment method/branch when needed.
6. Confirm the import.

On confirmation, the server writes an imported order, payment, customer linkage, KPI updates, and import audit data to Supabase. The SHA-256 file hash and transaction references prevent duplicate imports.

## 6. Run and verify

```bash
npm install
npm run lint
npm run build
npm run dev
```

Open the server URL shown in the terminal. Do not deploy the Vite static output without the Express server because Socket.IO, Gemini processing, authorization, and Supabase persistence run server-side.

## 7. Interconnection verification

The server persists each confirmed mutation before broadcasting the refreshed shared state. See `INTERCONNECTIONS.md` for the page-by-page flow. Messaging recipients are loaded from real Supabase profiles, and all AI/import HTTP calls include the user's Supabase bearer token.
