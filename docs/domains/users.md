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

The Sprint 2 18+ policy is implemented separately from this schema change so age eligibility remains a reusable business rule rather than being embedded in persistence.

## Private profile fields

The authenticated private response may include:

- full name
- date of birth
- email and phone/contact state
- verification state
- other profile/account metadata needed by the user

Date of birth must not be included in public user responses.

## Public profile fields

Public user responses may include presentation/community information such as:

- display name
- profile photo
- bio
- nationality
- hometown
- language
- current location/city
- occupation/student state
- trust summary

`fullName` and `dateOfBirth` are intentionally excluded from the public mapper in Beta 1.

## Profile updates

`PATCH /api/v1/users/me` is authenticated and only updates fields explicitly allowed by `UpdateProfileDto`.

The service normalizes text and rejects a date of birth in the future. The under-18 eligibility rule is tracked separately so it can be enforced consistently across profile completion and later sensitive actions.

Phone and verification evidence are not modified through this generic profile update route. Contact-verification state is handled by the dedicated Sprint 2 verification work.

## Compatibility

New identity fields are nullable during the transition because existing accounts were created before these fields existed. Missing identity fields mean the account is incomplete; they must not be interpreted as verified or eligible by later business rules.
