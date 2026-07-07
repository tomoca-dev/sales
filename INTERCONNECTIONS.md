# TOMOCA Data Interconnections

All business pages read the same authenticated Socket.IO state loaded from Supabase. Mutations are accepted by the Express server, persisted to Supabase, and then broadcast back to connected pages.

## Sales-document import

A confirmed Sales Board import creates or updates:

- **Orders**: one delivered historical order with the printed date, customer, line items, subtotal, VAT, total, references, store/station, and source-file metadata.
- **Payments**: one linked payment; cheques remain Pending and other confirmed methods are Cleared.
- **Customers**: matched by real email, phone, TIN, account number, or normalized name; missing contact fields are not invented.
- **Branches**: branch revenue, order count, average order value, and growth are recalculated when a real branch is selected or matched.
- **Sales Board / Finance / Payment Tracking / Customer Management / Analytics / AI Reports**: all use the same imported order and payment records.
- **Import Audit**: Parsed, Imported, Duplicate, and Failed attempts are stored in `sales_document_imports`.

Historical imported documents do **not** change current inventory, production tasks, delivery trips, or driver earnings because the document records a past sale rather than a new fulfilment request.

## New application order

A new Storefront or Sales Rep order creates:

- an order;
- a payment record;
- a production task;
- a customer link or customer update;
- an inventory deduction only when a real inventory item exactly matches the sold product and branch;
- refreshed KPIs and branch/customer analytics.

A delivery fee is calculated only when a real delivery location falls inside a configured delivery-zone polygon. No fallback fee or location is invented.

## Production and logistics

- Production status changes update the linked order status.
- A delivery trip is created only for a delivery order that becomes Ready for Dispatch and has a real available driver.
- Trip pickup/completion updates all linked order statuses and the assigned driver's availability.
- Drivers may update only their own location, trip, assigned orders, and payout requests.

## Payments, refunds, and finance

- Payment status changes are reflected in Payment Tracking, Cheque Follow-Up, Finance, and reports.
- Refunds update the linked payment and Finance totals.
- Driver payout processing updates the real payout record and driver balance.

## Authentication and roles

Supabase Auth supplies the identity. The server reads the role from `profiles`; the browser cannot promote itself. HTTP AI/import endpoints and Socket.IO mutations require an authenticated role. The message recipient list is built from real Supabase profile IDs rather than placeholder users.

## Empty database behavior

No product, branch, order, payment, inventory, driver, customer, insight, promotion, report, or KPI record is seeded. An empty Supabase project produces empty business pages and zero calculated KPIs until real records are entered or imported.
