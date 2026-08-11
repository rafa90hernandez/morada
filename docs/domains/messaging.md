# Messaging domain

## Beta 1 conversation contract

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

## Private image and PDF attachments

`POST /api/v1/conversations/:conversationId/attachments`

The endpoint accepts one JPEG, PNG, WebP or PDF with a maximum input size of 10 MB. The server does not trust the original filename and never uses it in the storage key.

Images are decoded, rotated, bounded to 4096 pixels, and re-encoded as JPEG. The original image metadata is not carried into the stored output. PDFs receive basic structural validation: declared MIME type, `%PDF-` signature and an `%%EOF` marker near the end. This structural check is **not malware scanning** and must not be represented as antivirus protection.

Processed bytes are stored through `PRIVATE_STORAGE_SERVICE` under an unpredictable server-generated key. The database stores only the private object key, MIME type, size and SHA-256 checksum. API responses do not expose the object key or checksum.

The current schema keeps the legacy `Message.imageUrl` and `Message.imagePublicId` columns for compatibility, but this flow does not populate them. Attachment kind is authoritative in `MessageAttachment.type` (`IMAGE` or `PDF`). The legacy `Message.type = IMAGE` remains the envelope value for attachment-bearing messages during this compatibility period.

Participant-only metadata and file access:

- `GET /api/v1/conversations/:conversationId/messages/:messageId/attachments`
- `GET /api/v1/conversations/:conversationId/messages/:messageId/attachments/:attachmentId`

Every read revalidates the authenticated user against the conversation and scopes the attachment to the requested message/conversation. There is no permanent or public attachment URL.

Responses use `Cache-Control: private, no-store`, `Pragma: no-cache` and `X-Content-Type-Options: nosniff`. Sanitized images may be rendered inline; PDFs are always returned with `Content-Disposition: attachment` so browsers download them rather than render them inline.

If private upload succeeds but database persistence fails, the service attempts to delete the uploaded object. Rollback deletion failures are logged rather than hidden.

### Deployment gate

The current local private storage implementation is suitable for development/testing only. Staging/production must not accept real private chat attachments until a deployed private object-storage configuration and the security policy for document uploads have been approved. No paid storage or malware-scanning provider is activated by this implementation.

## Realtime and cost

Beta 1 does not require WebSockets or an external realtime/messaging provider. Clients can refresh/poll the durable REST history. This keeps the first implementation on the existing NestJS/PostgreSQL stack with no new paid service.
