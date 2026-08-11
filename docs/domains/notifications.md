# In-app notifications domain

## Beta 1 purpose

Notifications are durable in-app records only. Beta 1 does not activate email, SMS, push, realtime or other external delivery providers.

## User lifecycle

Authenticated endpoints:

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:notificationId/read`
- `PATCH /api/v1/notifications/read-all`

List pagination is cursor-based, capped at 50 items and deterministically ordered by `createdAt DESC, id DESC`.

A user can only list, count or mutate their own notification records. Foreign cursors and foreign notification IDs are treated as not found.

## Event sources

The dedicated `InAppNotification` model is separate from the older legacy `Notification` model so Sprint 5 can evolve without reinterpreting historical enum values.

The initial durable events are created transactionally in PostgreSQL from committed product events:

- new conversation message -> counterpart receives `NEW_MESSAGE`;
- new visit proposal -> responder receives `VISIT_PROPOSED`;
- accepted visit -> requester receives `VISIT_ACCEPTED`;
- declined visit -> requester receives `VISIT_DECLINED`;
- replaced visit proposal -> requester receives `VISIT_REPLACED` and the newly inserted replacement independently notifies its responder;
- report resolution -> reporter receives `REPORT_RESOLVED`;
- report dismissal -> reporter receives `REPORT_DISMISSED`;
- listing transition to PAUSED -> listing owner receives `LISTING_PAUSED`.

The trigger implementation makes notification creation part of the same database commit as the originating record change; there is no external queue/provider in Beta 1.

## Privacy and navigation safety

Notification title/body text is generic and must not contain identity evidence, private document keys, exact addresses, admin notes or report descriptions.

Target navigation is revalidated when notifications are listed:

- `CONVERSATION`: authenticated user must still be a participant;
- `VISIT`: authenticated user must still be a participant;
- `LISTING`: user must own it or it must still be public/active;
- `REPORT`: authenticated user must be the original reporter.

If the target can no longer be accessed, the API preserves the notification history but returns `targetType`, `targetId` and `metadata` as `null`. This prevents stale notification metadata from becoming an authorization bypass.

Exact visit location is never stored in notification metadata.

## Cost

PostgreSQL + Prisma + NestJS only. No paid notification provider is activated.
