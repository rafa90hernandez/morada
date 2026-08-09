# Beta 1 Prisma Schema Audit

Date: 2026-08-09

## Purpose

Compare the current Prisma schema with the approved Beta 1 product scope before introducing migrations. The goal is incremental evolution, not a rewrite.

## Executive assessment

The current schema is a solid foundation. It already models users, profiles, verification state, trust score, listings, listing photos, exchange preferences, favorites, conversations, messages, reports, blocks, notifications and admin action logs.

However, Beta 1 requires several structural additions before the data model can safely support the approved product flows.

## Existing domains that can be evolved

### User
Existing strengths:
- email
- optional password hash
- refresh-token state
- role
- account status
- email/phone verification flags
- profile relation
- verification relation
- reporting/blocking relations
- admin audit relation

Required Beta 1 evolution:
- no fundamental replacement required
- consider explicit suspension metadata outside the enum if read-only preventive suspension needs reason/start/end/review state
- preserve single global ADMIN behavior for Beta 1 while keeping future extensibility

### UserProfile
Existing strengths:
- display name
- phone
- profile photo
- language/location context
- occupation/student flag

Missing P0 fields/semantics:
- legal/full name distinct from public display name
- date of birth for 18+ enforcement
- nationality
- hometown / city of origin
- explicit profile-completion state if required by flow

Privacy note:
- date of birth is private; public APIs should expose only what the product requires, not raw DOB by default

### Verification
Existing strengths:
- one-to-one user verification record
- timestamps for email/phone/document review

Current gap:
The model stores document status but does not model the evidence itself or a robust review lifecycle.

Beta 1 requires:
- typed identity document
- document expiry when applicable
- private object-storage reference(s)
- selfie-holding-document evidence
- submitted/reviewed/rejected/correction-requested states
- review reason/notes
- reviewer identity
- retention/deletion metadata
- auditability

Recommendation:
Keep `Verification` as the user-level aggregate/status and introduce dedicated private evidence records rather than adding many file columns directly to `Verification`.

Suggested new domain concept:
- `VerificationDocument` or `IdentityVerificationEvidence`

Do not store unnecessary extracted document numbers as normalized fields unless a concrete need is approved.

### TrustScore
Existing model can remain, but it is not required as a visible Beta 1 feature.

Recommendation:
Do not make Beta 1 launch depend on public trust-score calculation. Keep the table only if existing code depends on it; otherwise treat it as future-facing infrastructure.

### Listing
Existing strengths:
- ownership
- type/status
- title/description
- city/area
- basic property type
- rent/deposit/bills
- furnished/couple/pets/smoking
- availability
- rules/transport text
- moderation fields
- publish/close/delete timestamps
- photos/favorites/conversations/reports

Major Beta 1 gaps:

#### Location and privacy
Need structured private address and approximate public geolocation:
- address line(s)
- county
- city
- area/neighborhood
- postal district where useful
- Eircode/full postal code private when supplied
- latitude/longitude or geospatial representation for exact/private location
- approximate public latitude/longitude or a safe derivation strategy

Public mappers must never expose the full address automatically.

#### Financial
Need:
- estimated monthly bills when bills are not included
- first-rent-in-advance requirement/value
- derived initial estimated cost can usually be calculated rather than persisted

#### Property structure
Need structured fields for:
- whole property vs shared property
- bedroom count
- bathroom count
- floor
- lift
- heating type
- internet available
- Wi-Fi available
- laundry equipment/location
- kitchen equipment/amenities
- outdoor-space amenities
- accessibility amenities
- car/motorcycle/bicycle parking availability/details

Recommendation:
Use enums/booleans/arrays or related amenity records where queryability matters. Avoid putting Beta 1 filterable fields into free text or opaque JSON unless there is a strong reason.

#### Room/space
Need structured fields for:
- private vs shared space
- room type
- bed type
- max capacity
- number sharing the advertised room/space
- private vs shared bathroom
- number sharing the bathroom

#### Household/rules
Need structured fields for:
- total current residents
- descriptive current-household gender composition
- children/families accepted
- students accepted
- parties policy
- visitors policy
- quiet-hours / structured rule support where useful

Legal note:
The existing `GenderPreference` enum (`FEMALE_ONLY`, `MALE_ONLY`, `ANY`) is legally sensitive. Beta 1 has approved descriptive current-household gender composition, while exclusionary gender preference remains subject to legal validation before public activation.

Recommendation:
Do not expose or rely on `GenderPreference` in Beta 1 until the legal gate is resolved. Consider deprecating or feature-gating it rather than removing historical compatibility immediately.

#### Stay and requirements
Need:
- minimum-stay duration in a queryable representation
- proof-of-income required
- proof-of-employment required
- prior landlord/agency reference required
- optional objective requirement notes

`availableUntil` is not required by the approved Beta 1 core flow, though it may remain for future temporary accommodations if existing behavior uses it.

#### Transport
Current `transportInfo` free text is insufficient for the approved structured transport experience.

Suggested related model:
- `ListingTransportOption`
  - mode: BUS/LUAS/DART/TRAIN
  - stop/station name
  - walking minutes

#### Lifecycle
Current status enum includes `DRAFT`, while the current individual-listing product rule creates directly into `PENDING_REVIEW`.

Do not remove `DRAFT` blindly before considering future organization-internal drafts. For Beta 1, individual listing creation should not depend on DRAFT.

Need additional lifecycle metadata:
- expiry date
- last renewed date
- close reason enum / optional detail
- moderation review metadata where not represented elsewhere

Critical vs minor edits require service-level rules and audit history. A status enum alone is insufficient.

Suggested new concept:
- `ListingRevision` or generic listing change audit for material changes, if AdminActionLog is not sufficient for owner edits

### ListingPhoto
Existing model is suitable as a base.

Beta 1 considerations:
- photo visibility/moderation strategy
- private upload-to-public-publish lifecycle if needed
- ensure object-key based storage can migrate between providers

No rewrite required.

### Favorite
Existing simple favorite model directly supports P0.

P1/P2 custom lists/collaboration should not block Beta 1. Future models can be added separately instead of complicating the current P0 favorite table now.

### Conversation
Existing one-to-one listing-bound model is aligned with Beta 1.

Required review:
- blocking semantics currently live partly in `ConversationStatus` and partly in the global `Block` model; define one source of truth for authorization
- conversation history must remain available according to retention/moderation policy

### Message
Existing strengths:
- text
- image
- read timestamp

Beta 1 gap:
- PDF support
- private file metadata/object key
- MIME type
- size
- optional original filename

Current `MessageType` only supports `TEXT` and `IMAGE`.

Recommendation:
Add a document/PDF type and generic attachment metadata rather than a PDF-specific public URL field.

No edit/delete-for-everyone fields are required for Beta 1 because product policy disallows those actions.

### Visits
No visit/scheduling model currently exists.

Beta 1 requires a listing/conversation-bound visit concept with at least:
- conversationId
- proposer/participants as appropriate
- scheduled date/time information
- status
- overlap-warning behavior in service logic
- outcome: happened/cancelled/no-show/rescheduled
- created/updated timestamps

Recommendation:
Introduce a dedicated `Visit` model. Do not store visit scheduling only as chat text.

### Report
Existing model is a good foundation.

Beta 1 gaps:
- direct message-level report target is not modeled
- report reasons need alignment with product language, including discrimination/fake listing/fraud
- preventive suspension decision should be auditable independently from the report itself

Recommendation:
Add optional `messageId` relation and review the reason enum through a backward-compatible migration.

### Block
Existing model supports user-to-user blocking.

Service rules must additionally enforce:
- no new communication in either direction
- blocked user's listings hidden from blocker
- history preserved

No major schema rewrite required.

### Notification
Existing foundation is suitable but the enum is currently too narrow.

Beta 1 will need types for:
- visit proposal/confirmation/cancellation/reschedule
- listing correction request
- listing expiry reminders
- moderation/security decisions

P1 saved-search and favorite-change notifications can be added when those features are implemented.

User-level notification preferences by category are missing.

Suggested new concept:
- `NotificationPreference`

### AdminActionLog
Existing model is valuable and should remain central to administrative audit.

Beta 1 usage should include:
- verification decisions
- private-document access/view events where appropriate
- listing moderation
- suspension/reactivation
- report resolution

For high-volume document-view events, consider whether a separate audit-event table becomes cleaner; do not over-engineer before load exists.

### Organizations
No organization/company model currently exists.

Full organization/team behavior is P2 and must not block Beta 1 core validation.

Beta 1 may support professional advertisers using a simpler account classification if required, while the full model is introduced later.

Future concepts already approved:
- organization
- one admin
- up to 9 additional members
- individual credentials
- listing responsibility
- internal approval
- substitutions
- organization pause

Do not force these advanced models into Sprint 1 unless necessary for a concrete Beta 1 professional-user test.

## Recommended migration sequence

### Migration group 1 - Beta 1 foundation
1. Profile legal identity/age fields
2. Verification status enums and private evidence records
3. Listing core Beta 1 structured/filterable attributes
4. Private address + geolocation fields
5. Listing expiry/renewal/close reason metadata
6. Structured transport relation
7. Message PDF/attachment support
8. Visit model
9. Report message target + reason alignment
10. Notification preference + core notification enum expansion

### Migration group 2 - Post-core Beta additions
- saved searches
- custom favorite lists
- collaborative collections
- organizations and members
- advanced organization workflow
- negotiation checklist

### Migration group 3 - Future marketplace expansion
- WANTED flow enhancements
- exchange workflow
- ratings/occupancy confirmation
- matching/compatibility
- payments/contracts if ever approved

## Data-model rules to preserve

- Keep exact/private address separate from public listing DTOs.
- Keep identity evidence private and inaccessible through ordinary user/listing mappers.
- Do not normalize sensitive document data without a defined purpose.
- Filterable search attributes should be queryable without parsing prose.
- Authorization must be enforced server-side; schema ownership relations are not a substitute for service guards.
- Do not delete future-facing schema merely because the feature is deferred if doing so would create unnecessary migrations/rework; feature-gate instead when reasonable.

## Immediate engineering follow-up

This audit should be followed by small, reviewable migrations rather than one giant schema rewrite.

Recommended first implementation PR after planning docs:
1. reconcile listing lifecycle behavior and validation using the current schema where possible
2. add tests
3. then introduce the first Beta 1 schema migration for profile/verification foundations
