# Beta 1 Closed-Beta Readiness Review

Date: 2026-08-13
Scope: repository release-candidate state after Sprint 6 issues #77-#84.

## Decision

**Repository release candidate: READY.**

The in-repository work required for Morada Beta 1 is complete at the release-candidate level. Quality gates, release-readiness validation and the deterministic critical journey have passed without provisioning external infrastructure.

**Live closed-beta activation: BLOCKED pending explicit owner approval of external/cost-sensitive and legal/commercial launch gates tracked in #93.**

This review does not authorize deployment, provider activation, app-store distribution, purchase, subscription or any other action that can generate charges.

## Sprint 6 completion

- #77 — Admin operational control plane — PR #85
- #78 — Privacy-safe Beta 1 analytics — PR #86
- #79 — Security and privacy hardening review — PR #87
- #80 — Backup and restore readiness — PR #88
- #81 — Provider-agnostic observability and health readiness — PR #89
- #82 — Staging-to-production delivery pipeline readiness — PR #90
- #83 — Critical Beta 1 end-to-end journey tests — PR #91
- #84 — Mobile closed-beta polish — PR #92

## Engineering validation

### Quality gates

The final #83 and #84 pull-request heads passed the repository quality workflow, including Prisma generation, lint, typecheck, automated tests and builds. `Release readiness` also passed using its no-provisioning dry-run path.

### Critical journey

`Critical E2E` runs against disposable PostgreSQL 16, applies the committed migration history using `prisma migrate deploy`, and covers the critical Beta 1 path across listing publication/discovery, conversation, blocking, visits, exact-location privacy and listing closure.

The fresh-database test detected migration drift in `UserProfile`: the Prisma model contained `fullName`, `dateOfBirth`, `nationality` and `hometown` while the committed migration history did not create them. Sprint 6 now includes an additive migration restoring schema/migration compatibility before Beta 1.

The E2E workflow also explicitly enables Node VM modules required by the current Prisma 7 generated runtime under Jest. The legacy API smoke test now validates the real `/health` endpoint instead of the removed scaffold root route.

## Privacy and security posture

`docs/security/BETA1-SECURITY-REVIEW.md` records no unresolved in-repository P0 finding in its review scope and documents the production fail-closed boundary for local private storage, privacy-safe HTTP logging, authorization boundaries and the remaining external security gates.

Private identity, listing-authorization and chat evidence still require an approved durable private storage provider before staging/production. Malware-scanning policy for untrusted private PDFs, production secrets handling, infrastructure/network/TLS review and any external security assessment remain launch decisions rather than completed repository controls.

## Product analytics posture

`docs/product/BETA1-ANALYTICS.md` defines first-party, privacy-safe Beta 1 product events without adding a third-party analytics provider. This preserves the no-cost/no-tracking-provider boundary until an external analytics service is explicitly approved.

## Backup and recovery posture

`docs/operations/BACKUP-RESTORE.md` provides deterministic PostgreSQL backup scripts, disposable/local restore drills and CI-safe validation. Repository restore automation intentionally refuses staging/production.

A live Beta 1 still requires approved durable database hosting, encrypted offsite backup, durable public/private object storage, retention/access-control settings and a provider-specific production restore procedure. These may generate charges and are tracked in #93.

## Observability posture

Provider-agnostic health/readiness and operational observability are present in the repository. No monitoring SaaS or paid alerting backend is activated by this release candidate. Any external monitoring/alert delivery provider requires prior owner approval if it can generate charges.

## Delivery posture

`docs/operations/RELEASE-PIPELINE.md` deliberately contains validation and release gates rather than automatic deployment. Pull requests are validated; merging to `main` does not provision infrastructure or deploy production.

The production path must remain manual until the hosting, database, storage, secrets, backup and network/TLS targets are explicitly approved. Database migrations must not be applied to a live environment before a recoverable backup exists.

## Mobile closed-beta posture

`docs/mobile/CLOSED-BETA-POLISH.md` records the mobile Beta 1 boundaries. Session-expiry handling remains in memory, protected-request 401 behavior is distinguished from invalid-login behavior, and copy avoids unsupported realtime/presence/read-receipt claims. No push provider, maps provider, crash SaaS, device cloud or app-store activation is introduced by Sprint 6.

## Remaining launch gates

The authoritative external launch checklist is issue #93. At minimum, live real-user processing must not begin until the owner has explicitly approved the required hosting/runtime, PostgreSQL, public/private storage, secrets, backups, network/TLS/domain needs, monitoring delivery if external, mobile distribution path if required, malware-scanning decision and legal/commercial sign-off.

## Go / no-go boundary

- **GO:** treat the current repository as the Morada Beta 1 engineering release candidate and continue no-cost repository maintenance/testing.
- **NO-GO:** deploy or invite real closed-beta users before #93 is explicitly approved and the selected environment has been validated.

No paid or cost-bearing resource was provisioned, activated or purchased as part of this review.
