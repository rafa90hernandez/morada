# Favorites — Beta 1

## Scope

Beta 1 favorites are intentionally simple. A favorite links one authenticated user to one listing through the existing `Favorite` model.

No collections, collaboration, notes or sharing are included in P0.

## Endpoints

- `POST /favorites/:listingId` — favorite a currently public-eligible listing;
- `DELETE /favorites/:listingId` — remove the current user's favorite idempotently;
- `GET /favorites` — list the current user's favorites as public listing cards.

All endpoints require JWT authentication and derive ownership from the authenticated user ID. The client never supplies a `userId` to control favorite ownership.

## Eligibility

A listing can be newly favorited only when it is currently discoverable:

- `Listing.status = ACTIVE`;
- `Listing.deletedAt IS NULL`;
- Beta 1 listing type is supported (`RENTAL` or `TRANSFER`);
- `ListingLifecycle.expiresAt > now`.

If a previously favorited listing later expires, closes or is deleted, the favorite relationship may remain in the database for history, but it is not returned through the public favorites list and cannot re-enter discovery through favorites.

## Idempotency

The schema already enforces `@@unique([userId, listingId])`. `POST` uses an upsert on that compound key, so repeated favorite requests are safe. `DELETE` uses an owner-scoped `deleteMany`, so removing a missing favorite is also safe.

## Privacy

Favorite listing output reuses the dedicated public card projection. It does not load or return private address, Eircode, exact coordinates, identity/authorization evidence, storage keys or moderation notes.

## Cost posture

This feature uses the existing PostgreSQL/Prisma schema and requires no migration or paid external service.
