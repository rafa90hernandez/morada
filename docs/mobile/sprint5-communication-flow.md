# Sprint 5 mobile communication flow

## Scope

The current Expo app now connects public listing discovery to authenticated Beta 1 communication without adding realtime, push, analytics or paid providers.

## Session boundary

The app uses the existing `/auth/login` contract and keeps the returned session in React memory only.

This is intentionally not represented as persistent secure login. Restarting the app clears the mobile session. A later persistence implementation must use an approved secure credential/token store rather than plain AsyncStorage.

## Listing contact

Eligible public listing detail offers `Falar com anunciante` after authentication. The server still owns all authorization decisions: advertiser identity is derived from listing ownership and the mobile app does not submit an advertiser/user ID.

If the backend rejects contact, the app shows a generic unavailable state without exposing block or moderation internals.

## Conversations

The inbox uses the participant-only conversation endpoint and refreshes every 15 seconds plus manual pull-to-refresh.

Conversation detail refreshes every 12 seconds. This polling is not presented as realtime. The UI does not claim online presence, delivery confirmation or read receipts.

Text messages are trimmed client-side, rejected when empty and capped at 2,000 characters before being submitted to the server. Backend validation remains authoritative.

If direct contact becomes unavailable, history remains readable while the composer and new visit proposal flow are disabled.

## Private attachments

Messages backed by the Sprint 5 private attachment contract display participant-authorized attachment metadata such as image/PDF type and size. The mobile UI never constructs or exposes a permanent storage URL.

The repository currently has no declared cross-platform image/document picker or secure file-viewer dependency, so this sprint does not add an unsafe ad-hoc upload/open path. Full mobile selection/viewing of private files should be added only with an explicit vetted client-side file handling dependency and the existing authenticated binary endpoint.

## Visits

Participants can propose future visit windows from a conversation. Proposal, acceptance, decline, cancellation and post-end outcomes use the server lifecycle directly.

An acceptance overlap warning is displayed explicitly and is not converted into a false automatic rejection.

The exact address is never taken from listing discovery. It appears only after the app calls the authenticated `/visits/:visitId/location` endpoint for a visit the backend currently authorizes. The value is kept in component memory and is removed when a refresh shows that exact-location access should no longer be offered.

## Notifications

The mobile notifications screen consumes the durable in-app notification lifecycle from Sprint 5. It supports unread count, mark-one-read, mark-all-read and safe navigation.

If the backend strips a stale target because access no longer exists, the app keeps the notification visible without attempting navigation.

## Cost

Current Expo/open-source dependencies only. No realtime, push, maps, analytics, SMS or email provider is activated by this work.
