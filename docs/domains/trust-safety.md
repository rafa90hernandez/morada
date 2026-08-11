# Trust and safety domain

## Beta 1 report submission

Authenticated ACTIVE users can submit a report through:

`POST /api/v1/reports`

The authenticated principal is always the reporter. Clients cannot set `reporterId`, report status, administrative notes or moderation outcomes.

Exactly one report context must be supplied:

- `reportedUserId`, for a direct user report;
- `listingId`, for a listing report;
- `conversationId`, for a conversation report.

For listing reports, the reported user is derived from listing ownership. For conversation reports, the reported user is derived as the other participant, and the reporter must already belong to that conversation. Users cannot report themselves or their own listing.

Reasons use the existing `ReportReason` enum. Optional descriptions are trimmed and bounded to 1,000 characters.

## Duplicate resistance

For the same reporter, reason and report context, an existing OPEN or UNDER_REVIEW report is returned instead of creating another record. Final RESOLVED/DISMISSED reports do not permanently prevent a later report about a new incident.

This is a first-line duplicate/spam control in addition to the API-wide throttling already present in the application.

## Privacy boundary

The public/user report API is submission-only. There is no endpoint that lets a reported user inspect reports received about them.

The reporter-facing submission response intentionally omits:

- report description;
- administrative notes;
- reporter profile/contact data;
- moderation audit data.

Reporter identity, report description and admin notes are available only to authenticated administrators through the admin report workflow. They must not be copied into notifications or reported-user-facing responses.

## Administrative review

Admin endpoints are protected by `JwtAuthGuard` plus the database-backed `AdminGuard`:

- `GET /api/v1/admin/reports`
- `GET /api/v1/admin/reports/:reportId`
- `POST /api/v1/admin/reports/:reportId/review`
- `POST /api/v1/admin/reports/:reportId/resolve`
- `POST /api/v1/admin/reports/:reportId/dismiss`

The queue contains OPEN and UNDER_REVIEW reports. Administrative detail includes reporter and target context needed for manual investigation.

Valid lifecycle:

- OPEN -> UNDER_REVIEW;
- OPEN or UNDER_REVIEW -> RESOLVED;
- OPEN or UNDER_REVIEW -> DISMISSED.

RESOLVED and DISMISSED are final in this Beta 1 workflow. Each transition requires normalized admin notes and creates an `AdminActionLog` entry with previous and next status.

## Preventive listing pause

For reports directly associated with a listing, an administrator can use:

- `POST /api/v1/admin/reports/:reportId/actions/pause-listing`
- `POST /api/v1/admin/reports/:reportId/actions/restore-listing`

Only an ACTIVE, non-deleted listing can be preventively paused. The pause stores an exact provenance marker in `pausedReason`:

`Preventive safety pause for report <reportId>`

Restoration is allowed only when the listing is still PAUSED and the marker exactly matches that report. This prevents the report workflow from reactivating a listing that was paused later for a different moderation or lifecycle reason.

The preventive pause and restoration are both audited in `AdminActionLog`.

## User account actions

Beta 1 does **not** automatically suspend a reported user's account from a report. The current `User.status` field does not record suspension provenance. Automatically restoring such a status could accidentally reactivate an account suspended by a separate safety or administrative process.

User-targeted reports therefore remain in manual admin review until a provenance-aware account restriction model is introduced. This is intentionally safer than implementing an ambiguous automatic suspension/restore path.

## Cost and automation boundary

This workflow uses the existing NestJS, Prisma/PostgreSQL, JWT/admin guard and audit log foundations only. It does not activate a paid moderation provider, AI moderation service, external abuse database, SMS, email or other paid service.
