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
- `REJECTED` → `PENDING_REVIEW`
- Any editable status → `PENDING_REVIEW` after owner changes
- Any non-closed status → `CLOSED`
- Soft delete → `CLOSED` plus `deletedAt`

## Important invariants

- Closed listings cannot be edited.
- Only active listings can be paused.
- Only paused listings can be reactivated.
- Only rejected listings can be resubmitted.
- Ownership must be established by the database query, not by trusting request data.
- Public responses and owner responses must remain separate mapper contracts.

## Known cleanup

- Remove the obsolete `DRAFT` state from schema and service logic through a migration.
- Use `@CurrentUser('id')` in the controller.
- Remove the redundant ownership check in `softDelete` because `getOwnedListing` already scopes by owner.
- Add non-empty and maximum-length validation to user-provided text fields.
