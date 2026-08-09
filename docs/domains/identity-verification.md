# Identity Verification Domain

## Purpose

Identity verification is a private trust-and-safety workflow. It is intentionally separated from public profile media and listing-photo storage.

The Beta 1 workflow is manual: Morada reviews an accepted identity document together with a selfie showing the same document. This model does not perform automated face matching, biometric template extraction or biometric scoring.

## Accepted document types

`IdentityDocumentType` is limited to the Beta 1 document set:

- `PASSPORT`
- `EU_EEA_NATIONAL_ID`
- `DRIVING_LICENCE`
- `IRP`

IRP is accepted as Morada verification evidence; the workflow may request another document if the evidence is inconclusive.

## Submission lifecycle

Each verification attempt is represented by an `IdentityVerificationSubmission` instead of overwriting the previous attempt.

Typed states are:

- `SUBMITTED`
- `UNDER_REVIEW`
- `CORRECTION_REQUIRED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

A later submission can therefore coexist with an earlier rejected/cancelled submission for audit and retention purposes.

`Verification` remains the account-level verification aggregate. The new submission records evolve that existing relation incrementally rather than replacing contact-verification fields.

The old generic `documentStatus`, `documentSubmittedAt` and `documentReviewedAt` fields remain temporarily for compatibility. New identity workflows use the typed submission model and mirror the latest submitted timestamp/state into the legacy summary only while compatibility is required.

## User submission endpoint

Beta 1 accepts authenticated submissions through:

`POST /api/v1/users/me/identity-verification/submissions`

The route contains no target user ID. Ownership therefore comes exclusively from the authenticated JWT principal and cannot be selected by the client.

Multipart fields are:

- `documentType` — required and validated against `IdentityDocumentType`
- `documentFront` — required
- `documentBack` — optional; may be requested when the document requires it
- `selfieWithDocument` — required

A submission cannot enter `SUBMITTED` without both the primary document image and selfie-with-document evidence.

Only active accounts satisfying the central 18+ policy can submit identity evidence.

## Resubmission rules

Evidence is versioned rather than overwritten.

A new user submission is blocked while the latest non-deleted attempt is:

- `SUBMITTED`
- `UNDER_REVIEW`
- `APPROVED`

`APPROVED` requires a future explicit re-verification/reset workflow rather than allowing silent replacement by the user.

A new attempt is allowed after:

- `CORRECTION_REQUIRED`
- `REJECTED`
- `CANCELLED`

The service checks this rule before storage and again inside a serializable database transaction. Stored private objects are rolled back when the database write fails or a concurrent submission wins the race.

## Evidence records

`IdentityVerificationEvidence` distinguishes:

- `DOCUMENT_FRONT`
- `DOCUMENT_BACK`
- `SELFIE_WITH_DOCUMENT`

Each evidence row stores only storage metadata:

- private `objectKey`
- MIME type
- byte size
- optional SHA-256 checksum
- deletion timestamp

There is deliberately **no permanent URL field**. Verification evidence must never use the public listing-photo URL contract.

## Image validation and sanitization

The API accepts declared JPEG, PNG or WebP uploads with a maximum input size of 10 MB per image.

The server does not trust the declared MIME type alone. Sharp decodes the image, rejects unsupported/invalid content, rotates according to source orientation, constrains dimensions and re-encodes the evidence as JPEG before private storage.

The re-encoding step intentionally does not preserve source EXIF metadata. This prevents unnecessary retention of embedded device/location metadata while retaining the visible evidence needed for manual review.

## Private storage boundary

Identity evidence uses a dedicated `PrivateStorageService` contract, separate from the existing public `StorageService`.

The local development implementation writes under `storage/private`. `ServeStaticModule` continues to expose only `storage/uploads`, so identity evidence has no static HTTP route.

The private contract returns an object key only and exposes server-side read/delete operations. It does not return a URL.

Before staging/production accepts real evidence, the local provider must be replaced/configured with deployed private object storage that provides authorization and auditability. The application must never fall back to the public uploads provider for identity evidence.

## Privacy boundary

Identity submissions and evidence are private. They must not be returned by public user/profile mappers.

The user-facing submission response contains safe workflow metadata only: submission ID, document type, status, submission timestamp and evidence types. Raw object keys, checksums and internal review data remain server/admin-only.

Admin evidence access must be auditable. The existing `AdminActionLog` is the preferred audit boundary for review/access actions in #28.

## Retention

`IdentityVerificationSubmission.retainUntil` is the policy-controlled deletion deadline. `deletedAt` fields support soft deletion/tombstoning after the underlying private objects are removed.

Retention durations are intentionally not hardcoded in the Prisma schema. The service layer will assign `retainUntil` according to the legally approved Morada retention policy. This allows different periods for approved, rejected, abandoned or dispute/fraud-related cases without a schema change.

Cleanup/background deletion jobs remain outside the submission flow.

## Storage requirements

Before Beta 1 accepts real identity evidence in a deployed environment, storage must provide:

- private-by-default objects
- no public bucket/object access
- unpredictable object keys
- server-side MIME/size validation
- authorized reads only
- restricted admin access
- access/audit logging
- deletion support compatible with `retainUntil`
- backups whose retention is aligned with the deletion policy

## Migration strategy

The #26 schema change is additive:

- no existing column is removed
- no existing column becomes required
- new enums/tables reference existing `Verification` and `User` records

This means an application rollback to previous code remains compatible with a database that already contains the new unused tables.

A reviewable SQL migration is committed with the model. The repository currently uses `prisma db push` for local development, so adopting `prisma migrate deploy` repository-wide requires a separate baseline/deployment decision.
