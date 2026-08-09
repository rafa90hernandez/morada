# Listing Authorization Domain

## Purpose

Listing authorization verifies the advertiser's relationship to, or authority over, a specific accommodation. It is deliberately separate from identity verification.

An approved identity proves who the advertiser is. It does not by itself prove that the person may advertise a particular property.

## Evidence categories

Beta 1 accepts typed evidence:

- `TENANCY_AGREEMENT`
- `LANDLORD_AUTHORIZATION`
- `PROOF_OF_OWNERSHIP`
- `AGENCY_MANDATE`
- `OTHER_SUPPORTING_DOCUMENT`

A tenancy agreement can establish a relationship to the property without establishing that a landlord authorized a transfer/sublet. Later moderation must preserve that distinction rather than presenting one generic "verified" claim.

## Submission lifecycle

`ListingAuthorizationSubmission` is versioned per listing and uses:

- `SUBMITTED`
- `UNDER_REVIEW`
- `CORRECTION_REQUIRED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

`SUBMITTED`, `UNDER_REVIEW` and `APPROVED` block silent replacement. A new version may be created after correction/rejection/cancellation. Approval re-verification requires an explicit future flow rather than overwriting trusted history.

Each attempt stores submitted/review metadata, optional retention/deletion metadata and separate nullable review outcomes for:

- relationship verified
- landlord authorization verified

Those outcome fields are intentionally not client-controlled; Sprint 3 #39 will own the admin decision workflow.

## Owner flow

Authenticated endpoint:

- `POST /api/v1/listings/me/:listingId/authorization/submissions`
- `GET /api/v1/listings/me/:listingId/authorization/latest`

Ownership comes from a database query scoped by authenticated `userId`, listing ID and `deletedAt = null`.

`WANTED` listings do not use this evidence flow.

A submission requires at least one and at most five evidence files.

## File policy

Accepted inputs:

- PDF
- JPEG
- PNG
- WebP

Maximum input size: 10 MB per file.

Images are decoded with Sharp, orientation-normalized, resized within 4096x4096 and re-encoded as JPEG so source image metadata is not retained.

PDFs retain their original bytes because rewriting may destroy document structure or signatures. Before storage, the server requires a PDF MIME declaration plus `%PDF-` header and `%%EOF` marker near the end of the file. This is format validation, not malware scanning.

Production/staging must add malware scanning before real user documents are accepted if the deployed file-security architecture requires it.

## Private storage

Evidence uses the existing `PrivateStorageService` boundary established for identity verification, but has a separate object namespace:

`listing-authorization/<user>/<listing>/<submission>/<server-generated-file>`

The original filename is never used as the object key.

Persisted evidence metadata contains:

- private object key
- evidence category
- MIME type
- byte size
- SHA-256 checksum
- normalized original filename when available
- deletion timestamp

Ordinary owner responses expose safe metadata only. They do not return object keys, checksums or permanent URLs.

If database persistence fails after upload, already-created private objects are deleted on a best-effort rollback path.

## Concurrency

Submission eligibility is checked before upload and again inside a serializable transaction. This prevents two near-simultaneous requests from silently creating competing active review attempts. If the transaction loses the race, its uploaded private objects are rolled back.

## Retention

The schema is retention-ready through `retainUntil` and `deletedAt`. Final cleanup timing follows the project privacy/retention policy and will be enforced by a cleanup job before production document handling.

## Moderation dependency

This issue only establishes submission/storage lifecycle. Sprint 3 #39 must add:

- admin review queue/detail
- audited authorized reads of private evidence
- correction/reject/approve decisions
- precise public trust semantics distinguishing relationship from landlord authorization
- final publication gates including identity and complete listing location
