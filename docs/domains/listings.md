# Listings Domain

## Purpose

The Listings domain manages accommodation advertisements created by authenticated users and exposes approved advertisements publicly.

## Supported types

- `RENTAL`
- `TRANSFER`
- `EXCHANGE`
- `WANTED`

## Creation

Listings are created directly in `PENDING_REVIEW`. There is no product-level draft workflow.

Creation performs type-specific validation before persistence. Exchange listings may create an associated exchange preference record.

## Visibility

Public reads must require:

- `status = ACTIVE`
- `deletedAt = null`

Owner reads are scoped by both `userId` and listing ID and exclude soft-deleted records.

## Owner actions

- update
- pause
- reactivate
- resubmit
- close
- soft delete

## Administrative moderation

Moderation is exposed separately under `admin/listings` and requires both `JwtAuthGuard` and the database-backed `AdminGuard`.

The admin guard does not trust an authorization role stored in the JWT. The current access token contains the authenticated user identity, and moderation authorization resolves that user from the database for every moderation request. Access requires the current database record to have:

- `role = ADMIN`
- `status = ACTIVE`

Supported moderation actions:

- approve a `PENDING_REVIEW` listing
- reject a `PENDING_REVIEW` listing with a non-blank reason

Approval changes the listing to `ACTIVE`, clears stale rejection/pause state and sets `publishedAt`. Rejection changes the listing to `REJECTED`, stores the normalized rejection reason and clears publication state.

The listing transition and its `AdminActionLog` entry are written in the same Prisma transaction so a moderation decision is not persisted without its audit record.

## State transition rules

- Create → `PENDING_REVIEW`
- `PENDING_REVIEW` → `ACTIVE` through admin approval
- `PENDING_REVIEW` → `REJECTED` through admin rejection
- `ACTIVE` → `PAUSED`
- `PAUSED` → `ACTIVE`
- `REJECTED` → `PENDING_REVIEW` only through explicit resubmission
- Critical edit on a previously approved (`ACTIVE` or `PAUSED`) listing → `PENDING_REVIEW`
- Minor edit preserves the current listing status
- Any non-closed status → `CLOSED`
- Soft delete → `CLOSED` plus `deletedAt`

## Edit moderation policy

Edits are classified by whether they materially change the offer, its financial terms, availability, location, authorization basis or another field that requires renewed trust review.

### Critical edits

The current model treats the following as critical when their value actually changes:

- listing type
- city or area
- property type
- monthly price
- deposit amount
- bills-included state
- extra-cost information
- gender preference
- whether the landlord lives in the property
- formal-contract state
- landlord-approval requirement
- availability dates
- exchange destination, price range, property types or move date

A critical edit only sends the listing back to moderation when the listing had already been approved (`ACTIVE` or `PAUSED`). Pending listings remain pending, and rejected listings remain rejected until the owner explicitly resubmits them.

### Minor edits

Examples that do not automatically trigger renewed moderation:

- title/copy corrections
- description improvements
- furnished flag
- couples/pets/smoking preferences
- house-rule text
- transport information
- presentation-only changes such as photo ordering

The policy should expand as Beta 1 adds structured address, sharing-condition and authorization-evidence fields. New material fields must be explicitly classified rather than inheriting an accidental default.

## Important invariants

- Closed listings cannot be edited.
- Only active listings can be paused.
- Only paused listings can be reactivated.
- Only rejected listings can be resubmitted.
- Only listings pending review can be administratively approved or rejected.
- Ownership must be established by the database query, not by trusting request data.
- Administrative authorization must be resolved from current database state, not trusted from request data.
- Public responses and owner responses must remain separate mapper contracts.
- Submitting an unchanged critical field must not cause unnecessary re-review.
- A rejected listing must not bypass the explicit resubmission flow merely by being edited.

## Auditability

Administrative approval and rejection decisions are recorded in `AdminActionLog` atomically with the listing transition.

A complete owner-change history for material listing edits is still separate Beta 1 schema work, as identified in the Beta 1 schema audit.

## Known cleanup

- Remove the obsolete `DRAFT` state from schema and service logic through a migration.
- Remove the redundant ownership check in `softDelete` because `getOwnedListing` already scopes by owner.
