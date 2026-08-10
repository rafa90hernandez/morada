# Listing Revision Audit Domain

## Purpose

`ListingRevision` preserves a focused audit trail for owner edits that matter to trust and moderation. It is not event sourcing and it does not replace the current listing state.

The current listing remains the source of truth for product reads. Revisions answer a narrower operational question: what materially changed, who changed it and whether the edit required renewed moderation?

## Classification

A revision is classified as:

- `CRITICAL`
- `MINOR`

Critical classification is sourced from the existing listing edit policy. The audit layer does not maintain a second independent list of critical fields.

Critical edits on a previously approved `ACTIVE` or `PAUSED` listing continue to move that listing to `PENDING_REVIEW`. Minor edits preserve the existing status.

## Change detection

A revision is created only when a submitted PATCH actually changes stored data.

Examples that do not create audit noise:

- submitting the same price again
- submitting the same availability date again
- reordering set-like amenity arrays without changing their contents

The revision stores a sorted `changedFields` list so moderation does not need to parse application logs to identify material edits.

## Value minimization

Structured values are retained in `before` and `after` JSON when they are useful for moderation, for example:

- price
- occupancy structure
- availability
- typed requirements
- amenities
- area-level location fields

User-entered free-text fields are represented in `changedFields`, but their full previous/new text is not duplicated into revision JSON. This reduces unnecessary retention of personal information while still showing moderators which content was edited.

## Exact location

Changes made through the dedicated private-location flow are always classified as critical.

The revision may retain changed area-level fields (`city`, `area`, `county`, `postalDistrict`). If address, Eircode or exact coordinates change, `changedFields` contains `privateLocation`, but the exact values are deliberately excluded from `before`/`after`.

Exact address and coordinates remain available only through their existing private owner/admin authorization boundary.

## Atomicity

For the generic listing PATCH, a material edit and its `ListingRevision` are persisted in the same database transaction. A failure to persist the revision therefore prevents confirmation of that audited edit.

The private-location flow already operates inside a transaction and creates its revision in that same transaction.

## Revision record

Each record contains:

- listing ID
- actor user ID
- classification
- changed field names
- minimized before/after values
- listing status before and after the edit
- prior publication timestamp when present
- creation timestamp

The actor/listing identifiers are deliberately stored as audit identifiers rather than a generic event graph. No evidence blob, authorization document, exact address or media object is copied into the revision table.

## Admin moderation

Protected route:

- `GET /api/v1/admin/listings/:id/revisions`

It requires the existing `JwtAuthGuard + AdminGuard` boundary and returns revisions newest first. Sprint 3 #39 can consume this directly in the moderation detail workflow to show what changed since prior approval.

## Out of scope

This audit does not turn the application into event sourcing and does not record every UI action.

Presentation-only photo reordering is not a critical revision. Dedicated photo audit can be added later only if a moderation requirement justifies it.
