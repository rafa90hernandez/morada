# Listings Domain

## Purpose

The Listings domain manages accommodation advertisements created by authenticated users and exposes approved advertisements publicly.

## Supported types

- `RENTAL`
- `TRANSFER`
- `EXCHANGE`
- `WANTED`

## Creation

Individual Beta 1 listings are created directly in `PENDING_REVIEW`. There is no user-facing draft workflow for individual advertisers.

The schema keeps `DRAFT` for future organization-internal workflow compatibility. Beta 1 individual listing creation must not depend on it.

Creation performs type-specific validation before persistence. Exchange listings may create an associated exchange preference record.

## Structured Beta 1 accommodation data

The listing model evolves the original fields instead of replacing them. Existing price, deposit, bills, furnished, couples, pets, smoking, location and property-type fields remain the compatibility base.

Structured fields now cover the main Beta 1 accommodation details needed for later search and moderation:

### Property and advertised space

- entire vs shared property
- bedroom and bathroom counts
- private vs shared advertised space
- room type and bed type
- maximum occupancy
- people sharing the advertised space
- private vs shared bathroom
- people sharing the bathroom

### Household

- current resident count
- descriptive current-household gender composition
- whether the landlord lives in the property
- couples accepted
- children/families accepted
- students accepted
- pets accepted
- smoking policy

`HouseholdGenderComposition` describes the current household only. It is not an exclusion rule for applicants.

The legacy `GenderPreference` enum/column remains in the database temporarily for compatibility, but Beta 1 create/update DTOs do not accept it and the public listing mapper does not expose it. Exclusionary gender preferences remain feature-gated pending legal validation.

### Financial and stay terms

- monthly price
- deposit
- bills-included state
- estimated monthly bills
- first-rent-in-advance amount
- extra-cost note
- available-from date
- legacy available-until date
- minimum stay in days

When `billsIncludedType = NO`, an estimated monthly bills amount is required by the service.

### Objective requirements

- formal-contract state
- landlord-approval requirement
- proof of income required
- proof of employment required
- prior landlord/agency reference required
- optional other-requirements note

These fields describe objective advertiser requirements. They do not replace the separate right-to-advertise evidence workflow planned for Sprint 3.

### Property facilities and accessibility

- floor / ground-floor state
- lift
- step-free access
- accessible entrance
- adapted bathroom
- wheelchair space
- accessible parking
- optional accessibility note
- heating type
- internet / Wi-Fi availability
- whether internet is included in bills
- optional internet speed/provider
- washing machine / dryer
- shared-building laundry / extra-cost state
- typed kitchen amenities
- typed outdoor amenities
- car / motorbike / bicycle parking
- paid / secure parking state

### House rules

- parties allowed
- visitors allowed
- quiet-hours note
- general house-rules text

## Structured transport

`ListingTransportOption` stores queryable nearby public transport independently from the legacy `transportInfo` text field.

Supported modes:

- `BUS`
- `LUAS`
- `DART`
- `TRAIN`

Each option may contain:

- stop/station name
- line name
- walking minutes
- distance in metres

Up to 20 options are accepted by the listing DTO. Nested metadata is validated server-side. Updating `transportOptions` replaces the listing's structured transport set; omitting the field preserves the existing set.

`transportInfo` remains temporarily for backward compatibility and free-form context, but future filtering must use structured transport records rather than parsing prose.

## Validation invariants for structured data

In addition to DTO range/enum validation, service-level cross-field rules currently include:

- when bills are explicitly not included, estimated monthly bills are required
- a private bathroom cannot declare people sharing that bathroom
- a listing marked as ground floor may only supply `floorNumber = 0`

Further cross-field completeness rules can be tightened incrementally as the Beta 1 create flow is built; existing development listings remain compatible because the new schema fields are additive/nullable or have safe empty-array defaults.

## Visibility

Public reads must require:

- `status = ACTIVE`
- `deletedAt = null`

Owner reads are scoped by both `userId` and listing ID and exclude soft-deleted records.

Exact/private address is not part of this structured-attributes change. Sprint 3 #37 introduces a separate private-address/public-location boundary, and public mappers must not expose exact location data when that work lands.

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

Supported moderation actions currently are:

- approve a `PENDING_REVIEW` listing
- reject a `PENDING_REVIEW` listing with a non-blank reason

Approval changes the listing to `ACTIVE`, clears stale rejection/pause state and sets `publishedAt`. Rejection changes the listing to `REJECTED`, stores the normalized rejection reason and clears publication state.

The listing transition and its `AdminActionLog` entry are written in the same Prisma transaction so a moderation decision is not persisted without its audit record.

Sprint 3 #39 expands this into the full Beta 1 review/correction/trust-gate workflow.

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

Edits are classified by whether they materially change the offer, its financial terms, availability, location, authorization basis, sharing conditions or objective eligibility requirements.

### Critical edits

The current model treats these categories as critical when their value actually changes:

- listing type
- city or area
- property type
- entire/shared property state
- private/shared advertised-space state
- bedroom/bathroom count
- room/bed type
- occupancy and sharing counts
- private/shared bathroom state
- current resident count / descriptive household composition
- monthly price, deposit, bills state, estimated bills, first-rent advance and extra-cost information
- whether the landlord lives in the property
- formal-contract / landlord-approval state
- proof-of-income / employment / prior-reference requirements
- couple / family / student / pet / smoking acceptance conditions
- availability dates and minimum stay
- exchange destination, price range, property types or move date

A critical edit only sends the listing back to moderation when the listing had already been approved (`ACTIVE` or `PAUSED`). Pending listings remain pending, and rejected listings remain rejected until the owner explicitly resubmits them.

### Minor edits

Examples that do not automatically trigger renewed moderation:

- title/copy corrections
- description improvements
- general house-rule text
- structured kitchen/outdoor amenities
- legacy transport text and structured nearby-transport presentation
- accessibility/presentation details that do not change the core advertised space
- presentation-only changes such as photo ordering

Sprint 3 #41 adds durable revision history so moderation can inspect material owner changes without turning the listing domain into a generic event-sourcing system.

## Important invariants

- Closed listings cannot be edited.
- Only active listings can be paused.
- Only paused listings can be reactivated.
- Only rejected listings can be resubmitted.
- Only listings pending review can currently be administratively approved or rejected.
- Ownership must be established by the database query, not by trusting request data.
- Administrative authorization must be resolved from current database state, not trusted from request data.
- Public responses and owner responses must remain separate mapper contracts as private address/evidence work is added.
- Submitting an unchanged critical field must not cause unnecessary re-review.
- A rejected listing must not bypass the explicit resubmission flow merely by being edited.
- Exclusionary `GenderPreference` is not part of the Beta 1 public listing contract.

## Auditability

Administrative approval and rejection decisions are recorded in `AdminActionLog` atomically with the listing transition.

A complete owner-change history for material listing edits is Sprint 3 #41.

## Migration strategy

The structured-attributes migration is additive:

- existing listing columns remain intact
- new scalar fields are nullable
- new enum-array amenities use safe empty-array defaults
- `ListingTransportOption` is a new child table
- search-oriented indexes are added only for selected structured fields

This keeps existing development listings compatible while the create/edit UI progressively adopts the richer Beta 1 contract.
