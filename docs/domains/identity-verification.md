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

The old generic `documentStatus`, `documentSubmittedAt` and `documentReviewedAt` fields remain temporarily for compatibility. New identity workflows must use the typed submission model. Removal of the legacy summary fields is a later migration after all callers have moved.

## Evidence records

`IdentityVerificationEvidence` distinguishes:

- `DOCUMENT_FRONT`
- `DOCUMENT_BACK`
- `SELFIE_WITH_DOCUMENT`

`DOCUMENT_BACK` is optional at the workflow level and can be requested when the selected document requires a reverse side.

Each evidence row stores only storage metadata:

- private `objectKey`
- MIME type
- byte size
- optional SHA-256 checksum
- deletion timestamp

There is deliberately **no permanent URL field**. Verification evidence must never use the public listing-photo URL contract.

When evidence needs to be viewed, the storage layer must generate a short-lived authorized access mechanism after checking the caller's permission. That mechanism belongs to the upload/review work in #27/#28 and is not implemented by this data-model task.

## Privacy boundary

Identity submissions and evidence are private. They must not be returned by public user/profile mappers.

Normal users may later receive only their verification state and safe workflow metadata. Raw object keys, checksums, review-internal data and evidence access details must remain server/admin-only.

Admin evidence access must be auditable. The existing `AdminActionLog` is the preferred audit boundary for review/access actions in #28.

## Retention

`IdentityVerificationSubmission.retainUntil` is the policy-controlled deletion deadline. `deletedAt` fields support soft deletion/tombstoning after the underlying private objects are removed.

Retention durations are intentionally not hardcoded in the Prisma schema. The service layer will assign `retainUntil` according to the legally approved Morada retention policy. This allows different periods for approved, rejected, abandoned or dispute/fraud-related cases without a schema change.

Cleanup/background deletion jobs are outside #26.

## Storage requirements

Before Beta 1 accepts real identity evidence, deployed storage must provide:

- private-by-default objects
- no public bucket/object access
- unpredictable object keys
- server-side MIME/size validation
- short-lived authorized reads
- restricted admin access
- access/audit logging
- deletion support compatible with `retainUntil`
- backups whose retention is aligned with the deletion policy

The current public/local media-storage behavior must not be treated as production identity storage.

## Migration strategy

The #26 schema change is additive:

- no existing column is removed
- no existing column becomes required
- new enums/tables reference existing `Verification` and `User` records

This means an application rollback to the previous code remains compatible with a database that already contains the new unused tables.

A reviewable SQL migration is committed with this change. The repository currently uses `prisma db push` for local development, so adopting `prisma migrate deploy` repository-wide requires a separate baseline/deployment decision; #26 does not silently change that operational contract.
