# Mobile closed-beta polish

The Beta 1 mobile client remains intentionally provider-light and privacy-first.

## Session behavior

Access tokens remain in memory only. A 401 from an authenticated API request invalidates the in-memory session and the login screen explains that the session expired. A 401 from the login endpoint itself is treated as invalid credentials, not session expiry.

The app does not claim durable login persistence. Secure device credential storage can be evaluated separately after the Beta 1 security model and dependency choice are approved.

## Communication claims

The closed beta does not claim realtime delivery, online presence, typing status or read receipts. Conversation refresh remains polling/request based.

## Location

Discovery and map UI use approximate public coordinates. Exact address access continues to come only from the authorized accepted-visit endpoint and can disappear when the server revokes eligibility, including after blocking.

## External services

No push provider, paid map provider, analytics SDK, crash-reporting SaaS, device cloud or app-store activation is introduced by this polish pass.
