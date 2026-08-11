# Messaging domain

## Beta 1 text conversation contract

Messaging is listing-bound and one-to-one. A conversation has one advertiser (`participantA`) derived from the listing owner and one seeker (`participantB`) derived from the authenticated requester. Clients cannot choose both participants.

### Starting a conversation

`POST /api/v1/conversations/listings/:listingId`

A new conversation can be created only when:

- the requester has an ACTIVE account;
- the requester is not the listing owner;
- the listing is ACTIVE, non-deleted and non-expired;
- the listing type is RENTAL or TRANSFER;
- the advertiser account is ACTIVE.

The operation is idempotent through the existing compound conversation key. If the same listing/seeker conversation already exists, it is returned even if the listing later expired or closed. This preserves the interaction record without manufacturing a new conversation against unavailable inventory.

## Participant-only reads

Authenticated participants can use:

- `GET /api/v1/conversations`
- `GET /api/v1/conversations/:conversationId`
- `GET /api/v1/conversations/:conversationId/messages`

Conversation and message pagination are cursor-based and bounded to 50 records per request. Non-participants receive a not-found response rather than conversation metadata.

Conversation summaries expose only the listing id/title/status and limited participant profile presentation fields (`displayName`, `profilePhotoUrl`). Emails, phone numbers, private location, evidence and administrative data are not part of the messaging read model.

## Sending text

`POST /api/v1/conversations/:conversationId/messages`

Text messages:

- require an ACTIVE sender account;
- require sender participation in the conversation;
- require conversation status ACTIVE;
- are trimmed, non-empty and limited to 2,000 characters;
- are persisted together with the conversation `lastMessageAt` update in one database transaction.

Existing conversation history remains readable after a listing expires/closes. Blocking enforcement is a separate Sprint 5 boundary (#63) and will make conversations non-sendable when either participant blocks the other.

## Attachments

The legacy `Message.imageUrl` / `imagePublicId` fields are not used by this text flow. Private image/PDF attachments are intentionally deferred to #62 so files can use the private storage abstraction and participant-only streaming instead of public upload URLs.

## Realtime and cost

Beta 1 does not require WebSockets or an external realtime/messaging provider. Clients can refresh/poll the durable REST history. This keeps the first implementation on the existing NestJS/PostgreSQL stack with no new paid service.
