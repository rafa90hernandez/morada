# Listing lifecycle — Beta 1

## Publication validity

A listing is publicly eligible only when all of the following remain true:

- `Listing.status = ACTIVE`;
- `Listing.deletedAt IS NULL`;
- a `ListingLifecycle` record exists;
- `ListingLifecycle.expiresAt` is strictly in the future.

The Beta 1 validity window is 45 days.

The database migration backfills lifecycle metadata for ACTIVE inventory and installs a PostgreSQL trigger that synchronizes `expiresAt` whenever a listing enters `ACTIVE`. The expiry anchor is `publishedAt` when available, so pausing/reactivating a listing does not manufacture a newer publication date.

Missing lifecycle metadata is treated fail-closed by public reads: the listing is not public until deterministic expiry metadata exists.

## Renewal

`POST /listings/:id/renew` extends `expiresAt` to 45 days from the renewal time and sets `lastRenewedAt`.

Renewal does **not** update listing `createdAt` or `publishedAt`, so it cannot be used to create an artificial recency/ranking boost.

Renewal is allowed only while the listing remains `ACTIVE` and still satisfies the essential Beta 1 trust gates:

- advertiser account ACTIVE;
- latest identity verification APPROVED;
- private and approximate public location present;
- at least one listing photo;
- latest right-to-advertise submission APPROVED;
- relationship to the property verified;
- landlord authorization verified when the listing requires it.

A critical edit already moves an ACTIVE listing back to `PENDING_REVIEW`; therefore it cannot bypass moderation through renewal.

An expired listing may still be renewed if it remains `ACTIVE` and passes the same trust gates. Expiry removes it from public visibility; it does not destroy owner/admin history.

## Public privacy and visibility

Both public listing detail and public trust metadata apply the expiry gate. At or after the exact `expiresAt` boundary the API behaves as if the public listing does not exist.

Future search/map implementations must apply the same `ACTIVE + non-deleted + expiresAt > now` rule.

## Closing

The normal close flow requires one structured `ListingCloseReason`:

- `RENTED_VIA_MORADA`
- `CLOSED_OUTSIDE_MORADA`
- `STOPPED_ADVERTISING`
- `PROPERTY_UNAVAILABLE`
- `LISTING_MISTAKE`
- `OTHER`

An optional free-text detail of up to 1000 characters may accompany the reason.

Closing updates `Listing.status = CLOSED`, sets `closedAt`, and persists the structured reason in `ListingLifecycle` in the same database transaction.

Soft delete remains a separate owner action and preserves the existing lifecycle semantics.

## Expiry reminders

`ListingLifecycleService.listExpiringBetween(from, to)` provides an internal query suitable for the future 7/3/1-day reminder job. It returns lifecycle rows only for listings that are still ACTIVE and non-deleted.

No scheduler, email/SMS provider, push provider, or other paid notification service is introduced by this Sprint 3 change.
