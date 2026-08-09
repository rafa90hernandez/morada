# Users Domain

## Purpose

The Users domain owns the authenticated account profile and the boundary between public profile information and private identity data.

## Authentication boundary

The JWT access token is only an authenticated principal. It currently carries `sub` and `email`; it is not a hydrated user record.

Authenticated profile reads must use the principal `id` to load the current user and relations from the database before mapping a response.

## Beta 1 profile model

The existing `UserProfile` evolves incrementally with nullable identity fields so existing development data remains compatible:

- `displayName`
- `fullName`
- `dateOfBirth`
- `nationality`
- `hometown`
- existing contact/presentation/location fields

Age eligibility is a business policy derived from date of birth rather than a persisted age field.

## 18+ eligibility policy

Beta 1 is restricted to users aged 18 or older.

`adult-eligibility.policy.ts` is the single reusable calendar-age policy for this rule. It returns one of:

- `MISSING_DATE_OF_BIRTH`
- `UNDERAGE`
- `ELIGIBLE`

Missing DOB is explicitly ineligible. It must never be treated as implicitly adult for verification, advertising or other sensitive actions.

Age is calculated using UTC calendar components so behavior does not change with the API server timezone. A user becomes eligible on the calendar date of the 18th birthday.

For deterministic and conservative handling of a February 29 birth date, the anniversary is treated as March 1 in a non-leap year. This is a Morada product convention and can be revised centrally if later legal review requires a different rule.

Profile updates reject a future date of birth and reject a DOB that produces an age below 18. Existing accounts with no DOB remain valid accounts but are explicitly incomplete/ineligible until they provide an eligible DOB.

## Contact verification

`Verification.emailVerifiedAt` and `Verification.phoneVerifiedAt` are the authoritative Beta 1 contact-verification state.

A channel is verified only when its corresponding timestamp is present. Private API responses derive `emailVerified` and `phoneVerified` from these timestamps rather than trusting the legacy booleans on `User`.

`User.emailVerified` and `User.phoneVerified` remain temporarily as compatibility mirrors while the schema evolves. Supported state transitions must update the authoritative timestamp and its legacy boolean mirror inside the same database transaction.

`ContactVerificationService` owns these transitions:

- mark email verified
- clear email verification
- mark phone verified
- clear phone verification

Phone verification also records a provider identifier. The identifier is vendor-agnostic and normalized by the service; Sprint 2 does not choose or integrate a paid SMS provider yet.

There is intentionally no public API endpoint that simply marks a channel verified. A future email/SMS verification adapter must prove its challenge first and then call the service transition. This avoids creating a client-controlled verification bypass.

When a verified contact value is changed in a future account-settings flow, that flow must revoke the corresponding verification through `ContactVerificationService` before or together with the contact change.

## Private profile fields

The authenticated private response may include:

- full name
- date of birth
- derived age
- adult eligibility status
- email and phone/contact state
- verification state
- other profile/account metadata needed by the user

Date of birth must not be included in public user responses.

## Public profile fields

Public user responses may include presentation/community information such as:

- display name
- derived age when the profile is adult-eligible
- profile photo
- bio
- nationality
- hometown
- language
- current location/city
- occupation/student state
- trust summary

`fullName` and `dateOfBirth` are intentionally excluded from the public mapper in Beta 1. An underage or incomplete profile does not expose an age publicly.

## Profile updates

`PATCH /api/v1/users/me` is authenticated and only updates fields explicitly allowed by `UpdateProfileDto`.

The service normalizes text, rejects a date of birth in the future and enforces the 18+ policy when DOB is supplied.

Phone and verification evidence are not modified through this generic profile update route. Contact-verification transitions use `ContactVerificationService`.

## Compatibility

New identity fields are nullable during the transition because existing accounts were created before these fields existed. Missing identity fields mean the account is incomplete; they must not be interpreted as verified or eligible by later business rules.

The legacy contact-verification booleans remain schema fields for now, but timestamps are authoritative. Removing the mirrors can happen in a later migration after all consumers rely on the verification relation.
