# Tinitix design system

Implemented 12 October 2026 using the supplied white / purple visual brief. The Next.js App Router, database catalog, checkout, organizer routes and integrations stay on the existing stack.

## Source files

- `app/design-system.css`: color, spacing, radius, typography and responsive tokens; shared controls, header, discovery grid and footer. Legacy color aliases let existing checkout and organizer screens share the new primary color.
- `app/layout.tsx`: self-hosted Poppins, Latin subset, weights 400, 500, 600 and 700. No font CDN request.
- `components/ui.tsx`: Container, Button with disabled/loading variants, Badge, SearchInput and SectionHeader.
- `components/shell.tsx`: existing Header/Navbar and footer. URL-based search, accessible mobile menu and existing account/organizer destinations.
- `components/catalog.tsx`, `components/event-card.tsx`, `components/event-spotlight.tsx`: filters, EventGrid, EventCard and manual EventHero. Hero shows up to six upcoming events; all catalog events remain searchable.
- `lib/format.ts`: compact Indonesian rupiah formatting, without currency-space or decimal padding.
- Existing organizer styles now use the shared font and primary color aliases. Legacy discovery styles have been removed from `app/discovery.css`; `app/editorial.css` is no longer imported.

## Interaction and media

Cards link to existing event details. Prices and sale badges come from catalog data. Search preserves the query in the URL and can be submitted using Enter or the visible arrow button. Categories, city, time window and price ordering remain available.

Carousel has no autoplay. Previous/next and direct position buttons work by keyboard; a numeric position replaces dots on small screens. Controls disappear when there is only one banner. The banner uses the existing dedicated event banner when available and falls back to its poster.

Poster frames are 3:4 with contain scaling. Existing demo artwork is landscape, so it is letterboxed to keep names, dates and venue information intact. Dedicated 3:4 thumbnails and mobile artwork would improve presentation when provided; no fake production event data was introduced. Demo events continue to use the existing no-database preview mode and banner.

## Validation

- Production build completed successfully.
- Six new Playwright checks passed: 320, 375, 768, 1024 and 1440px layouts, plus manual carousel behavior. Checks cover grid columns, no horizontal overflow, loaded artwork, Poppins, keyboard focus, mobile menu, search/filter actions and navigation to details.
- Six existing catalog and checkout checks passed across desktop, tablet and mobile.
- Transaction/report suite: 30 passed, 1 skipped (database connection-string fixture).
- Screenshots at the target widths were generated and reviewed. Primary, secondary and date text use the supplied accessible color tokens on white surfaces. No lint script is configured; build includes TypeScript checking.

No new backend integration is required for discovery. Payment and email configuration follow the existing environment configuration.
