# Beta 1 Security and Privacy Review

Date: 2026-08-11
Scope: Morada Beta 1 release-candidate repository state through Sprint 6.

## Review method

This review is repository-level and focuses on server-side authorization, public/private data boundaries, storage, upload handling, logging/configuration and the existing CI/dependency posture. It does not claim to replace an external penetration test, infrastructure audit or malware-scanning service.

## Findings

### P0

No unresolved in-repository P0 finding was identified in this pass.

The product already uses database-backed admin authorization, server-derived ownership/participants, private evidence keys with server-side reads, public/private listing-location separation, explicit block checks for contact/visits and revalidation of notification targets.

### P1 — fixed: local private storage could start in staging/production

Before this review `LocalPrivateStorageService` was bound as the private-storage provider in every environment. That implementation stores sensitive evidence on the application filesystem, which is not an approved staging/production durability or privacy boundary.

Fix: the local private-storage provider now fails closed during construction when `NODE_ENV` is `staging` or `production`. A deployed environment cannot start while still relying on the local provider. Development and test remain supported.

Release gate: configure and review a real private object-storage provider before staging/production accepts identity, listing-authorization or chat-attachment evidence. This provider may have cost and therefore requires owner approval before activation.

### P1 — fixed: private object keys were written to application logs

The local private-storage implementation previously emitted object keys in debug logs on upload/delete. Keys are not public URLs, but they are sensitive internal locators and should not be propagated into logs.

Fix: private object-key logging was removed.

### P1 — fixed: HTTP logs included query strings and client fingerprint fields

The HTTP logger previously recorded `originalUrl`, IP address and user-agent. Query strings may contain user-entered discovery context and future endpoints could accidentally place sensitive values there. IP/user-agent are unnecessary for the current Beta 1 operational objective.

Fix: request logs now contain request ID, HTTP method, path without query string, status code and duration only.

### P2 — accepted gate: no malware scanning for private PDF attachments

Private PDF uploads receive structural/type/size validation, but the repository does not claim malware scanning. Until a reviewed scanning approach exists, this remains an operational/security gate for production handling of untrusted PDFs. No paid scanner is activated by this review.

### P2 — accepted gate: secrets are environment-provided, not repository-managed

Production secret storage/rotation depends on the future deployment platform. Repository configuration already requires strong JWT secrets and production/staging CORS configuration, but choosing a managed secret store is an infrastructure decision.

Release gate: deployment must supply unique production secrets outside Git and document rotation/recovery. No secret-management service is activated here.

### P2 — accepted gate: external penetration test and infrastructure review

The repository has strong unit/regression coverage, but a closed-beta production launch should still include an infrastructure-level review and, when justified, an external security assessment. These are not represented as completed by this in-repo review.

## Boundaries rechecked

- Admin routes continue to require `JwtAuthGuard` plus database-backed `AdminGuard`.
- Listing ownership and conversation/visit participation are derived server-side rather than accepted from arbitrary client identity claims.
- Exact address/Eircode/exact coordinates remain outside public listing read models.
- Identity, listing-authorization and chat evidence are read through `PrivateStorageService`; object keys are not returned to public/user API consumers.
- Evidence reads remain authorization-gated and sensitive admin evidence reads are audited where designed.
- User blocking prevents new contact/message/attachment actions in either direction while preserving history.
- Exact visit location remains available only to authorized participants of an accepted, still-live visit and is revoked after bilateral blocking.
- Notification targets are revalidated before navigation is exposed.
- Production/staging CORS origins and JWT secret minimum lengths remain configuration requirements.
- CI installs from the frozen lockfile and runs Prisma generation, lint, typecheck, tests and builds.

## Regression tests added

- local private storage refuses staging/production;
- local private storage still permits development/test;
- path traversal outside the private storage root remains rejected;
- HTTP logs exclude query values, IP and user-agent fields.

## Release-candidate external gates

The following are intentionally not activated in this issue and must not be represented as complete production controls:

1. approved durable private object-storage provider;
2. malware-scanning policy/provider for untrusted private PDFs if required by the launch risk assessment;
3. production secret-management/rotation mechanism;
4. infrastructure/network/TLS configuration on the selected host;
5. external penetration/security assessment if required before wider launch.

Any cost-bearing provider or assessment remains subject to explicit owner approval before activation.
