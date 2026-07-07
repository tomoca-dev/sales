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
