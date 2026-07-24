# Tomoca Coffee Sales Platform

## Render deployment

This package is prepared for Render as a single Node Web Service. Use `render.yaml` or manually set Build Command to `npm ci && npm run build`, Start Command to `npm start`, and Health Check Path to `/healthz`. See `RENDER_DEPLOYMENT_GUIDE.md` for the complete step-by-step guide.


## Production deployment note

If the app works locally but deployed pages do not fetch data, check `DEPLOYMENT_FIX.md` first. This system requires the Express + Socket.IO server in `server.ts`; deploying only the Vite `dist` folder will make `/socket.io` and `/api/*` return 404.

Run `fix_supabase_profiles_500_and_imports.sql` in Supabase SQL Editor if the browser shows a 500 error on the `profiles` table.


# TOMOCA Coffee Platform

A React/Vite + Express + Socket.IO business platform backed by Supabase. Monetary dashboards use ETB only; no hardcoded foreign-exchange rates are displayed.

## Data behavior

The application contains **no seeded business records or mock dashboard data**. Products, orders, payments, customers, branches, inventory, drivers, reports, and all other operational records start empty and are loaded from Supabase. Empty pages show an empty-state message until real records are created or imported.

The Express server is the mutation layer. It persists the interconnected application state to `tomoca_platform_entities`, while Supabase Auth and `profiles` provide authenticated roles. Sales-document processing attempts are also mirrored to `sales_document_imports` for auditability.

## Scanned sales-document import

The Sales Board importer supports PDF, image, XLS/XLSX, DOCX, CSV, and TXT files. Image-only PDFs are sent to Gemini as the original PDF, structured fields are extracted, and the user must review and confirm the values before anything is saved.

A confirmed document creates and synchronizes:

- a historical imported order;
- its payment record;
- a matched or newly created customer record;
- branch statistics when a branch is selected or matched;
- Sales Board, Finance, Payment, Customer, Branch, reporting, and KPI views;
- an import audit record with duplicate-file protection.

Historical imports do not invent production, delivery, or inventory movements.

## Setup

1. Run `supabase_tomoca_schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env` and enter the required keys.
3. Install and run:

```bash
npm install
npm run dev
```

Build checks:

```bash
npm run lint
npm run build
```

See `SUPABASE_SETUP.md` for detailed configuration and role guidance, and `INTERCONNECTIONS.md` for the verified cross-page data flows.
