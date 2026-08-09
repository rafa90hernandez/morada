# Morada Beta 1 Environment Strategy

## Purpose

Define the minimum deploy architecture for a controlled Beta 1 before infrastructure is provisioned.

This document is intentionally provider-agnostic. It defines the capabilities Morada needs, the separation between environments and the order in which infrastructure should be introduced. Provider selection and paid provisioning can happen later without changing the application architecture.

## Principles

1. Staging and production are separate security and data boundaries.
2. The API should be stateless; persistent files must not depend on an application instance filesystem.
3. Production secrets never live in the repository or frontend bundles.
4. Verification evidence is private by default and must never depend on a permanent public URL.
5. Production deployment is a promotion of a tested staging candidate, not a separate code path.
6. Managed infrastructure is preferred where it removes operational work that the two-person project cannot reasonably absorb.
7. Provision only what Beta 1 needs; avoid premature microservices, Kubernetes or multi-region infrastructure.

## Environment model

### Local development

Current local development remains intentionally simple:

- API on the developer machine
- PostgreSQL 16 through Docker Compose
- local filesystem storage through `LocalStorageService`
- permissive browser CORS
- `.env` for local-only configuration

Local storage is a development adapter. It is not the production persistence model.

### Staging

Staging is the integration and release-candidate environment.

It must have its own:

- API deployment
- managed PostgreSQL database
- object storage namespace/buckets
- secrets
- CORS allowlist
- web/admin deployment URLs
- monitoring/error stream

Staging must not share the production database, production object bucket or production credentials. Use synthetic/test accounts and test documents whenever possible rather than copying production personal data.

### Production

Production is the closed-beta user environment.

It must have separate:

- API service
- managed PostgreSQL database
- object storage
- application secrets
- domains/origins
- logging/monitoring context
- backup policy

Production should be provisioned only after staging is working and the product/legal launch gates for the closed beta are satisfied.

## Recommended deploy architecture

### API

Use a managed application/container platform capable of:

- running the supported Node.js runtime
- deploying from a Git commit or container image
- HTTPS termination
- environment-level secrets
- health/readiness checks
- restart on failure
- application logs
- deployment rollback
- EU-region hosting where practical

The API should remain one deployable NestJS service for Beta 1. Do not split domains into independent services yet.

The runtime must not rely on local disk for durable user files. Application instances should be replaceable without data loss.

### PostgreSQL

Use managed PostgreSQL with a dedicated database per environment.

Requirements:

- staging and production isolated from each other
- encrypted connections
- automated backups
- restricted database credentials
- EU region where practical
- ability to restore from backup
- capacity to enable point-in-time recovery later if needed

Schema changes in deployed environments must use Prisma migrations and `prisma migrate deploy`. `prisma db push` remains a local-development convenience and is not the production migration process.

### Public web

Host the public/responsive web application on managed web hosting that supports the framework selected by the existing repository.

Requirements:

- separate staging and production deployments
- HTTPS
- environment-specific public API base URL
- no server/database/JWT secrets exposed to browser bundles
- preview deployments may exist, but must not receive production secrets by default

A final Morada domain is not required to start technical staging. Provider-generated temporary domains are acceptable until domain/trademark decisions are complete.

### Private admin web

The private admin interface should be a separate deployment/subdomain from the public web application.

The admin UI itself is not a security boundary. Every privileged action must continue to be protected by server-side authorization, such as the current database-backed `AdminGuard`.

For the initial closed beta, application-level admin authorization is sufficient. Additional network restrictions, SSO or VPN access can be evaluated later if the admin surface or team grows.

## Object storage strategy

The current `LocalStorageService` is suitable for local development only. Production/staging should introduce an object-storage implementation behind the existing storage abstraction rather than changing feature code to depend on a vendor SDK directly.

### Public/low-sensitivity images

Listing images may use a dedicated object-storage bucket or namespace designed for media delivery.

Requirements:

- separate staging and production namespaces
- immutable/object-key based files where possible
- controlled upload types and sizes in the API
- CDN/public delivery may be used for content explicitly intended to be public
- deletion must remove the storage object when the product lifecycle requires it

### Private verification documents

Identity and listing-authorization evidence require a separate private design.

Requirements:

- no public ACL
- no permanent public URL stored as the access mechanism
- object identifiers/keys stored in the database
- access only after server-side authorization
- short-lived signed access URLs or authenticated server streaming for authorized administrators
- encryption at rest provided by the storage platform
- access/audit logging where supported
- deletion capability for retention/privacy workflows
- separate staging and production namespaces

Verification documents must not be placed under the current publicly served `/uploads` path.

The exact retention period remains a legal/data-governance decision; the technical design must support deletion without redesign.

## Secrets management

Each deployed environment gets its own secret set through the hosting platform or a dedicated secrets manager.

At minimum:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- future object-storage credentials
- future email/SMS/provider credentials
- future monitoring credentials

Rules:

- never commit real secret values
- do not copy production secrets into staging
- use independent access and refresh JWT secrets
- rotate credentials if exposure is suspected
- prefer scoped credentials over account-wide credentials
- frontend deployments receive only values explicitly safe for the client

## Backups and restore expectations

### Staging

Baseline:

- automated daily database backup if the managed service supports it at the selected tier
- staging may accept a recovery point objective of up to 24 hours
- staging restore may be handled within one business day

Staging is not the backup source for production.

### Production Beta 1

Initial target:

- automated database backups at least daily
- retain enough restore points to recover from several days of accidental corruption/deletion; target 14–30 days when economically available
- target RPO: no worse than 24 hours for the first closed beta
- target RTO: approximately 4 hours for a database/service incident during actively supported periods
- enable point-in-time recovery when the selected managed database tier and beta risk justify it

Private object storage should use provider durability/versioning or equivalent safeguards where economically reasonable, while still allowing privacy-driven deletion.

### Restore discipline

Before inviting external beta users:

1. confirm a backup exists;
2. perform at least one database restore test into a non-production environment;
3. document the restore steps and credentials required;
4. repeat restore tests after meaningful infrastructure/database changes and periodically during operation.

A backup that has never been restored should not be treated as proven recovery capability.

## Logging, monitoring and alerting

Minimum Beta 1 observability:

- API structured/application logs
- request ID correlation
- health/readiness endpoint monitoring
- error tracking for unhandled application errors
- uptime checks for production API and public web
- basic database/storage health visibility from managed providers
- environment label on logs/errors so staging and production are distinguishable

Alerts should focus on actionable conditions:

- production API unavailable
- repeated 5xx errors
- database unavailable
- deployment failure
- storage failures affecting uploads
- abnormal resource/cost growth

Do not log passwords, tokens, verification-document contents or other sensitive request payloads. Logging policy should evolve with the Beta 1 privacy review.

## Deployment and promotion flow

### Pull request

1. feature branch opens PR;
2. GitHub Actions runs generate, lint, typecheck, tests and build;
3. failed checks block completion;
4. reviewed/accepted change merges into `main`.

### Staging

After infrastructure exists:

1. `main` deploys automatically or through a simple release workflow to staging;
2. run `prisma migrate deploy` against staging before/with the application release;
3. run health/readiness smoke checks;
4. exercise the affected critical flow manually or through future integration smoke tests;
5. the exact commit SHA becomes the production candidate.

### Production

For the closed beta, production promotion should require manual approval.

1. promote the same tested commit/image from staging;
2. take/confirm a recent database backup before higher-risk migrations;
3. run backwards-compatible migrations first where possible;
4. deploy the API/web/admin candidate;
5. confirm health/readiness and a small set of critical smoke flows;
6. monitor errors after release.

Do not deploy production directly from an unmerged feature branch.

### Rollback

Application rollback should redeploy the previous known-good commit/image.

Database migrations should be designed to be backwards compatible whenever possible so an application rollback does not require an emergency destructive database rollback. Destructive schema cleanup should be separated from the release that stops using the old fields.

## Mobile environment handling

When mobile Beta 1 development resumes, use separate build profiles/configuration for staging and production API endpoints.

A staging mobile build must never silently point at production. Production credentials/secrets must not be embedded in the mobile application.

## Cost envelope

Initial infrastructure target: approximately **EUR 100/month or less**, excluding legal/compliance costs.

This is a budget guardrail, not a requirement to spend the full amount.

Prioritize spending in this order:

1. managed PostgreSQL and reliable backups;
2. API runtime;
3. private/public object storage;
4. essential monitoring/error tracking;
5. public/admin web hosting.

Cost controls:

- keep staging on the smallest practical resources and scale to zero/sleep when the provider safely supports it
- start production with one modest API instance unless traffic proves otherwise
- use storage/CDN tiers appropriate to a closed beta
- configure provider budget alerts before external beta usage
- review infrastructure if projected recurring spend reaches roughly EUR 75/month; explicit approval before intentionally exceeding EUR 100/month

Exact provider prices must be checked at provisioning time because plans change.

## Provisioning order

Do not provision everything now.

Recommended sequence:

### Trigger 1 — persistent staging integration is needed

Provision:

- staging managed PostgreSQL
- staging API
- staging secrets

### Trigger 2 — image/document flows need remote integration

Add:

- staging object storage
- production-ready storage adapter behind `STORAGE_SERVICE`
- private verification storage path/access model

### Trigger 3 — web/admin integration needs stable URLs

Add:

- staging public web
- staging admin web
- staging CORS allowlist

### Trigger 4 — closed beta launch candidate passes technical + legal gates

Provision/activate:

- production database
- production API
- production object storage
- production web/admin
- production secrets
- backups/monitoring/budget alerts
- production CORS origins

This sequencing keeps paid infrastructure deferred until it creates real development or beta value.

## Beta 1 infrastructure readiness checklist

Before external users are invited:

- [ ] staging and production databases are separate
- [ ] staging and production storage are separate
- [ ] production API is stateless with respect to user file persistence
- [ ] production CORS contains only approved origins
- [ ] production secrets are injected outside the repository
- [ ] listing images use durable object storage
- [ ] verification documents use private storage with no permanent public URL
- [ ] database migrations use `prisma migrate deploy`
- [ ] production database backup exists
- [ ] restore test has been completed
- [ ] health/uptime/error monitoring is active
- [ ] budget alert is configured
- [ ] staging candidate is validated before manual production promotion
- [ ] legal/compliance launch gate has been cleared separately

## Decisions intentionally deferred

The following should be chosen only when provisioning is actually required:

- specific cloud/PaaS vendor
- specific managed PostgreSQL vendor/tier
- exact object-storage vendor
- exact CDN provider
- exact monitoring/error-tracking vendor
- final domain/subdomain names
- point-in-time recovery tier beyond the baseline

The architecture above keeps those choices replaceable and avoids committing the product prematurely to one vendor.
