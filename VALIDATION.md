# Validation Notes

## Automated checks completed

- `npm run lint` passes (`tsc --noEmit`).
- `npm run build` passes and produces the production `dist` bundle.
- The Express/Vite server starts successfully with no Supabase credentials.
- With no Supabase connection, the application keeps all operational collections empty and `/api/state` correctly rejects unauthenticated access.
- Every Socket.IO event emitted by the current frontend has a corresponding server-side handler.

## Sales-document import path

The Sales Board importer accepts the original file bytes for PDF and image uploads, computes a SHA-256 hash, sends the file with the authenticated Supabase session, creates a Parsed/Failed/Duplicate audit record, presents editable extracted fields, and creates interconnected order/payment/customer/import records only after confirmation.

A live Gemini extraction request was not executed in the isolated build environment because outbound network access was unavailable. Production extraction therefore requires a valid `GEMINI_API_KEY` and server internet access. The application returns a clear configuration or processing error instead of inserting fallback sales data.

## Interconnection coverage

- Imported sale → order, payment, customer, branch KPIs, sales analytics, finance, payment tracking, reports, and import history.
- New order → payment, production task, customer, matching inventory deduction, branch/customer KPIs.
- Production → linked order status and delivery-trip creation only when a real driver is available.
- Trip → linked order status and driver availability.
- Payment/refund/payout → finance and linked balances/statuses.
- All mutations persist through the authenticated Express server and are rebroadcast through the shared Socket.IO state.

## No mock-data behavior

No operational products, orders, branches, customers, inventory, drivers, zones, payments, promotions, reports, recommendations, heatmap points, or KPI values are seeded by the application. Empty Supabase tables remain empty in the UI.
