# Organizer accounts and access

## Account and organizer setup

- `/organizer/register` collects first name, last name, phone, birth date, gender, email, and password. Registration creates an account with buyer access, without creating an organization.
- After email verification, Organizer Login opens `/organizer`. Accounts without an organizer see only the Create Organizer action in the page content.
- Create Organizer opens a modal collecting Individual/Company, organizer name, an immutable unique URL slug, international phone, optional newsletter opt-in, and required terms/privacy consent.
- Saving creates the organization, upgrades its account membership to admin, and refreshes `/organizer` to show the organizer card. It does not open a report dashboard.
- The card opens `/organizer/events`. Selecting an event opens `/organizer/events/[id]`; Overview, Sales Trend, and Buyer Analytics use live transaction snapshots.
- `/o/[slug]` is the public organizer URL and lists only published upcoming events. Contact details and consent preferences are not public.
- Existing organizers remain attached to their accounts. Concurrent/repeated creation requests reuse the existing organization and cannot replace its URL. Staff accounts cannot create an organization.
- EO accounts can buy tickets; `/account` uses the verified email to find personal purchases, including purchases from other organizers.

## Database rollout

Apply `006_organizer_profile.sql` and `007_organizer_details.sql` before deploying these changes. Existing organizations keep nullable type, slug, and phone fields; existing account data is preserved. Local code changes do not apply migrations or update the hosted website automatically.

## Access controls

Email verification proves control of the email address. Organizer admin access is scoped to one organization, including event editing, order exports, ticket cancellation, check-in, and reporting. Authentication emails are excluded from the preview outbox. Client-supplied role and organization IDs cannot grant access.

## Verification

Transaction tests cover verification, account creation before organization creation, required consent, tenant isolation, concurrent creation, and EO ticket purchases. Browser test sources cover the modal flow; running the database browser suite requires a dedicated test database.

## Live dashboard

`GET /api/admin/live?eventId=...` requires a verified organizer admin and checks event ownership. Each response uses a read-only repeatable-read snapshot. Open dashboards poll every three seconds, pause when hidden, and display a connection error when data cannot be refreshed.

Revenue includes only paid orders. Overview distinguishes ticket subtotal, tax, service fee, and total payments; it does not represent an available payout balance. Stock uses the same converted and unexpired active reservations as checkout, including shared venue capacity and people per package. Sales Trend groups payments by payment time in the event timezone. Buyer Analytics deduplicates paid buyers by email. Checkout age and web traffic are not collected and are shown as unavailable.

Apply `008_live_dashboard_indexes.sql` for the polling query indexes. Migrations 006–008 and the live dashboard have been deployed to staging. Staging payments remain simulated. Type checking and the deployment build passed; the final live purchase flow has not been rerun.