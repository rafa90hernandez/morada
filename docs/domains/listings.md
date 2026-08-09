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

## State transition rules

- Create → `PENDING_REVIEW`
- Approved by moderation → `ACTIVE`
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
- Ownership must be established by the database query, not by trusting request data.
- Public responses and owner responses must remain separate mapper contracts.
- Submitting an unchanged critical field must not cause unnecessary re-review.
- A rejected listing must not bypass the explicit resubmission flow merely by being edited.

## Auditability

The edit policy determines moderation state but does not by itself provide a complete listing change history. Beta 1 schema work must add an auditable owner-change trail for material listing changes and moderation decisions, as identified in the Beta 1 schema audit.

## Known cleanup

- Remove the obsolete `DRAFT` state from schema and service logic through a migration.
- Use `@CurrentUser('id')` in the controller.
- Remove the redundant ownership check in `softDelete` because `getOwnedListing` already scopes by owner.
- Add non-empty and maximum-length validation to user-provided text fields.
