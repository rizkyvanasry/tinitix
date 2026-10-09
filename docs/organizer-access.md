# Organizer accounts and access

- `/organizer/register` creates a separate organization and its admin account. The account cannot use admin APIs until email verification succeeds.
- Existing verified buyers can create their own organization from the same page after login. Concurrent submissions reuse the existing admin membership. Client-supplied roles and organization IDs are never accepted.
- An organizer admin controls only their organization. This is not a platform-wide administrator role.
- Verification currently proves control of the email address; it is not business-identity or merchant verification.
- Staff accounts remain attached to their assigned organization. Self-service staff invitations are not implemented; membership setup still requires the operator. Organizer admins cannot take staff from another organization.
- Event edits, order listings/exports, Excel reports, ticket cancellation, check-in, and preview mail access are scoped to the organization. Preview mail excludes authentication emails entirely; production returns no preview mail.
- Real payment onboarding, merchant verification, and always-online workers remain separate rollout steps.

## Automated evidence

The transaction suite tests unverified denial, separate organizations, cross-organization rejection, concurrent buyer-to-organizer conversion, and reservation/payment races. Browser tests exercise signup/verification/login and decode downloaded ticket QR files before check-in. All database test fixtures use isolated schemas.
