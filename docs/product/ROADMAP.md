# Morada Roadmap

## Planning horizon

Target: closed Beta 1 within approximately 12 weeks, prioritizing quality, security and validation of the core product loop over feature volume.

Suggested interpretation:
- 8 weeks: functional alpha
- 10 weeks: beta candidate
- 12 weeks: safer closed beta

## Epic structure

### Epic A - Foundation & Quality
- CI/CD
- root workspace scripts
- environment strategy
- security hardening
- tests
- staging/production readiness

### Epic B - Identity & Profiles
- account/profile
- 18+ eligibility
- contact verification
- identity-verification state

### Epic C - Verification & Trust
- private document storage
- identity evidence
- property/listing authorization evidence
- admin review
- audit logs

### Epic D - Listings
- listing lifecycle
- structured listing attributes
- photos
- critical vs minor edits
- expiry/renewal
- close reasons

### Epic E - Search & Discovery
- filters
- sorting
- public listing detail
- map/list views
- approximate location
- clustering
- search visible map area

### Epic F - Favorites
- simple favorites for Beta 1
- richer collections after core validation

### Epic G - Messaging
- listing-bound 1:1 conversations
- text, images and PDF
- history preservation

### Epic H - Visits
- visit scheduling
- overlap warning
- visit outcome

### Epic I - Trust & Safety
- reports
- blocking
- preventive suspension
- moderation workflows

### Epic J - Admin
- verification queue
- listing moderation
- user/report management
- audit access

### Epic K - Notifications
- critical and configurable product notifications

### Epic L - Organizations
- basic professional support first
- advanced team and operational workflows after core beta

### Epic M - Analytics
- event capture
- operational/product dashboard

## Sprint plan

### Sprint 1 - Foundation and alignment (Weeks 1-2)
Goal: make the repository a reliable base aligned with the approved product direction.

- consolidate product documentation
- audit Prisma schema against Beta 1
- reconcile listing lifecycle
- implement critical vs minor edit policy
- strengthen validation
- add meaningful root scripts
- configure CI gates
- improve tests for critical listing transitions
- tighten production CORS/configuration
- define staging/production environment strategy

### Sprint 2 - Identity and verification (Weeks 3-4)
Goal: establish trusted accounts and private verification evidence.

- complete profile model/flows
- 18+ rule
- contact verification path
- private document upload
- identity + selfie evidence
- verification statuses
- admin identity review
- retention-aware data model

### Sprint 3 - Listings and moderation (Weeks 5-6)
Goal: advertisers can submit complete, reviewable accommodation offers.

- Beta 1 listing attributes
- photos
- full private address + approximate public location
- authorization evidence
- moderation queue
- approve/reject/request correction
- critical edit re-review
- expiry and renewal
- close reasons

### Sprint 4 - Search and discovery (Weeks 7-8)
Goal: seekers can efficiently find relevant accommodation.

- essential filters
- sorting
- listing cards/detail
- simple favorites
- map/list
- approximate markers and clustering
- search visible map area

### Sprint 5 - Messaging, visits and safety (Weeks 9-10)
Goal: interested users can safely contact advertisers and schedule visits.

- listing conversation
- text/image/PDF
- blocking
- reports
- visit scheduling
- overlap warning
- visit outcome
- essential notifications

### Sprint 6 - Admin, production and release candidate (Weeks 11-12)
Goal: operate a controlled closed beta.

- admin operational polish
- basic analytics dashboard
- security review
- backups
- observability
- staging -> production pipeline
- critical end-to-end tests
- mobile polish
- closed-beta readiness review

## Definition of Done

A development task is complete only when applicable requirements are satisfied:
- implementation complete
- authorization/business rules enforced server-side
- lint passes
- typecheck passes
- relevant tests pass
- build passes
- documentation updated when behavior/contracts change
- no known regression in the core flow

## Closed beta success signals

The initial beta is intended to answer:
- Can a legitimate advertiser complete verification and publish?
- Can a seeker find a relevant listing?
- Does the user understand what Morada verified?
- Do conversations start successfully?
- Are visits scheduled?
- Are listings closed through or after Morada interactions?
- How long does manual verification take?
- Where do users abandon the flow?
- What operational burden does moderation create?

Downloads and raw signup volume are secondary during this phase.
