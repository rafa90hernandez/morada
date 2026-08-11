# Visits domain

## Beta 1 purpose

Visits are tied to an existing listing conversation. They are not a public booking calendar and do not expose the private listing address through discovery.

## Proposal lifecycle

`POST /api/v1/conversations/:conversationId/visits`

Either conversation participant may propose a future visit window. The server derives the counterpart from the conversation; the client cannot choose arbitrary visit participants.

A proposal requires:

- an ACTIVE requester account;
- an ACTIVE conversation involving the requester;
- an ACTIVE, non-deleted listing;
- an ACTIVE counterpart account;
- no block in either direction between the participants;
- a future window with end after start;
- a maximum visit duration of four hours;
- a start no more than 90 days in advance.

The same contact/block/listing eligibility is rechecked transactionally before persistence.

Visit statuses are:

- `PROPOSED`
- `ACCEPTED`
- `DECLINED`
- `REPLACED`
- `CANCELLED`
- `COMPLETED`
- `NO_SHOW`

The record also keeps proposal, response, cancellation and outcome timestamps. No visit outcome modifies a trust score in Beta 1.

## Responding and replacement proposals

The current proposal responder may:

- `POST /api/v1/visits/:visitId/accept`
- `POST /api/v1/visits/:visitId/decline`
- `POST /api/v1/visits/:visitId/replacement`

A replacement does not rewrite the original proposal. The original becomes `REPLACED` and a new `PROPOSED` visit points to it through `replacementForId`, with requester/responder roles reversed for the counter-proposal.

## Overlap warning

When a visit is accepted, the API checks other `ACCEPTED` visits for the same listing whose time windows overlap.

An overlap is not silently ignored and is not automatically converted into a rejection. The accept response contains:

- `overlapWarning`
- the conflicting visit IDs and time windows

This preserves the advertiser's ability to intentionally accept adjacent/grouped access while making double-booking visible to the client. Clients should present the warning clearly.

## Cancellation and outcomes

Either participant may cancel a `PROPOSED` or `ACCEPTED` visit.

After an accepted visit's scheduled end, either participant may record `COMPLETED` or `NO_SHOW`. The API records who submitted the outcome and when. These outcomes are operational history only in Beta 1; they are not converted into automatic reputation penalties or trust claims.

## Exact-address privacy boundary

Participant-safe visit list/detail endpoints never include private address fields.

`GET /api/v1/visits/:visitId/location`

Exact location is returned only when all of the following are true:

- the authenticated user is one of the visit participants;
- the account is ACTIVE;
- the visit status is `ACCEPTED`;
- the visit has not yet ended;
- a private location exists for the associated listing.

`PROPOSED`, `DECLINED`, `REPLACED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`, past or non-participant requests receive a not-found style response and no private location data.

This endpoint is the only visit-specific access path for `addressLine1`, `addressLine2`, `eircode`, `exactLatitude` and `exactLongitude`.

## Cost

The Beta 1 implementation uses NestJS, Prisma and PostgreSQL only. It does not activate an external calendar, booking, SMS, push or realtime provider.
