# Beta 1 Analytics

## Purpose

Morada Beta 1 uses first-party PostgreSQL data only. No third-party analytics SDK, advertising identifier, tracking pixel or external analytics service is enabled.

The goal is to answer the closed-beta product questions with the smallest additional data surface possible.

## Data-minimization strategy

Most product milestones already exist in canonical operational tables and are aggregated directly from those sources:

- listing publications: audited `LISTING_APPROVED` admin actions;
- conversations started: `Conversation.createdAt`;
- visits scheduled: visits with a responder timestamp whose current lifecycle proves they reached an accepted state (`ACCEPTED`, `CANCELLED`, `COMPLETED` or `NO_SHOW`);
- completed/no-show outcomes: `Visit.outcomeAt` + final status;
- listing closes: `Listing.closedAt`.

Morada does **not** duplicate these milestones into a generic analytics payload.

A search does not otherwise leave a canonical operational record, so Beta 1 stores one minimal `ProductEvent` type: `SEARCH_PERFORMED`.

## SEARCH_PERFORMED schema

Stored fields are restricted by the Prisma model and server-side writer to:

- generated event ID;
- event type (`SEARCH_PERFORMED` only);
- schema version;
- occurrence timestamp.

The event intentionally has no user ID, session ID, listing ID, IP address, device identifier, query text, filters, location, price range, message content, report content or arbitrary JSON metadata.

## Explicitly prohibited analytics data

Analytics must not store:

- identity or listing evidence/object keys;
- exact/private addresses or coordinates;
- message bodies or private attachment metadata;
- report descriptions or admin notes;
- authorization headers, access/refresh tokens or passwords;
- email addresses, phone numbers or document identifiers;
- arbitrary `metadata: Json` payloads;
- advertising/device tracking identifiers.

## Admin dashboard

`GET /api/v1/admin/analytics/summary` is protected by `JwtAuthGuard` and the database-backed `AdminGuard`.

It returns only aggregate counts for all retained history, the last 30 days and the last 7 days, plus average identity/listing-authorization review turnaround in minutes over a bounded 30-day sample.

No raw `ProductEvent` rows are exposed through the endpoint.

## Retention

Beta 1 target retention for raw `SEARCH_PERFORMED` events is **90 days**. This is intentionally longer than the 30-day primary dashboard window while still limiting accumulation.

The repository does not currently run an always-on scheduler. Production readiness must therefore include a reviewed maintenance mechanism for deleting raw `ProductEvent` rows older than 90 days before treating retention as automated. No paid scheduler or hosted analytics service is required by this design.

Canonical product records continue to follow their own domain/legal retention rules rather than the analytics-event retention window.

## Indexing

`ProductEvent` is indexed by `(type, occurredAt)` and by `occurredAt` so aggregate windows and retention cleanup can avoid full-table scans as the closed beta grows.

## Reliability boundary

Search event recording is best-effort. An analytics write failure must not make public discovery fail. The writer logs only the event type when recording fails; it does not log query/filter data or user-sensitive context.
