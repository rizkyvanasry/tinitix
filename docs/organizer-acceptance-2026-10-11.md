# Organizer acceptance, 11 October 2026

The database browser suite ran in an isolated PostgreSQL schema with outbound email disabled. It exercised a newly registered organizer account, verification, login, organizer and event creation, a simulated couple-ticket purchase, automatic dashboard updates, Sales Trend and Analytics, and an Excel export. A second organizer could not read the event's live data or export. The separate purchase flow also covered ticket delivery, QR scanning, and duplicate-scan rejection.

The staff browser flow covered an admin inviting a new account, selecting an event, the recipient registering and verifying their email, accepting the invitation, and the admin revoking access. The account retained buyer access after revocation.

`node .vercel/run-current-browser.mjs`: 3 passed. `npm test`: 30 passed, 1 skipped (a connection-string fixture that does not apply to this test database). `npm run typecheck`: passed.

The live dashboard reconciliation test compares subtotal, tax, service fee, gross sales, couple package units versus people, unique buyers, expired reservations, available stock, daily sales, and Excel against database records. It also checks cross-organizer and non-admin access. Payments in these tests are simulated; no real charge or outbound message was made.
