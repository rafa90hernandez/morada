# Listing Location Domain

## Purpose

Beta 1 stores the exact accommodation address for verification while exposing only an approximate location publicly.

The exact and public representations are intentionally separated in both the API and the Prisma schema so a future public mapper cannot accidentally expose the private address by loading one generic location object.

## Data model

### Public listing fields

The `Listing` record keeps queryable area-level context:

- `city`
- `area`
- `county`
- `postalDistrict`

These fields may be shown publicly and used by future search filters.

### `ListingPrivateLocation`

One private record may exist per listing and contains:

- address line 1
- optional address line 2
- optional Eircode
- exact latitude
- exact longitude

This relation must never be selected by an unauthenticated public-location query.

### `ListingPublicLocation`

One public approximation record may exist per listing and contains:

- approximate latitude
- approximate longitude
- explicit radius in metres
- approximation algorithm version

The public point is not client-controlled.

## Approximation policy

Beta 1 uses `GRID_V1`.

The server places the exact point into a geographic grid and persists the centre of that grid cell as the public point. The current public precision contract uses a 1,500 metre radius.

This is deliberately different from returning exact coordinates with fewer decimal places at response time. Exact and approximate coordinates are separate persisted values with different authorization boundaries.

If the approximation algorithm changes later, the `approximationVersion` field allows existing records to be identified and recalculated deliberately.

## Owner flow

Authenticated owner routes:

- `PUT /api/v1/listings/me/:id/location`
- `GET /api/v1/listings/me/:id/location`

The owner write accepts city/area/county/postal district, exact address/Eircode and exact coordinates.

Ownership is established with a database query scoped by both authenticated `userId` and listing ID. Request data cannot choose another owner.

The server:

1. validates the exact input
2. derives the public approximation server-side
3. writes area-level listing fields, private location and public location in one transaction
4. sends an already-approved `ACTIVE` or `PAUSED` listing back to `PENDING_REVIEW` when the location actually changed
5. leaves status unchanged when the submitted location is identical

Closed listings cannot change location.

Eircodes are normalized to uppercase for storage.

## Public flow

Public route:

- `GET /api/v1/listings/:id/location`

It is available only when the listing is `ACTIVE` and non-deleted.

The database query uses an explicit safe `select` containing only:

- listing ID
- city
- area
- county
- postal district
- `publicLocation`

It does not load `privateLocation` at all. The response therefore cannot expose address lines, Eircode or exact coordinates through mapper drift.

## Administrative flow

Admin route:

- `GET /api/v1/admin/listings/:id/location`

The controller requires `JwtAuthGuard + AdminGuard`. `AdminGuard` resolves current admin authorization from database state rather than trusting a JWT role claim.

The admin response may include exact and approximate location because exact location is necessary for listing verification/moderation.

## Generic listing-update compatibility

The pre-existing generic listing DTO still contains `city` and `area` for incremental compatibility with development data and earlier clients.

The dedicated location endpoint is the authoritative Beta 1 path for establishing a complete location. Sprint 3 final moderation (#39) must require a complete private/public location pair before a listing can become public.

A later cleanup may narrow generic `city`/`area` editing once clients have migrated to the dedicated location flow. This should not be done through a destructive migration merely to satisfy Beta 1.

## Security invariants

- exact address is never returned by the unauthenticated public-location route
- public coordinates are derived server-side, never accepted from the client
- owner reads/writes are scoped by authenticated user ID
- admin exact-location reads require the existing database-backed admin authorization
- exact-location changes on previously approved listings require renewed moderation
- exact and approximate coordinates are stored separately
- soft-deleted listings are not readable through the location APIs

## Migration strategy

The location migration is additive:

- add nullable `county` and `postalDistrict` columns to `Listing`
- add one-to-one `ListingPrivateLocation`
- add one-to-one `ListingPublicLocation`
- preserve existing `city` and `area` columns
- no current listing data is deleted or rewritten
