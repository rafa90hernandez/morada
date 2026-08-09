# Morada Beta 1 Scope

## Objective

Validate the core housing loop:

> find -> trust -> converse -> visit -> close

The closed beta should prove that seekers can find relevant accommodation and that legitimate advertisers can publish, communicate and close listings safely enough for early use.

## Launch model

- Closed beta by invitation
- Initial target: approximately 20-50 users
- Mix of seekers, private advertisers and, if possible, at least one professional advertiser
- No payments handled by Morada
- No monetization required for Beta 1

## P0 - Beta blocking

### Accounts and identity

- Signup and login
- Account recovery
- 18+ eligibility
- Basic profile
- Email/phone verification as required by the flow
- Manual identity verification
- Accepted identity documents: passport, EU/EEA national identity card, Irish Residence Permit (IRP), driving licence
- Document image plus selfie holding the document
- Reverification when necessary due to expiry, inconsistency, fraud risk or material identity changes

### Verification and private documents

- Private upload/storage
- Admin-only access to verification evidence
- Audit trail for access and decisions
- Separate identity verification from property/listing authorization
- Listing authorization evidence may include tenancy agreement, ownership evidence, written landlord authorization, agency mandate or property-management authority
- When landlord authorization is claimed, written proof is required
- Public trust indicators must state what was verified rather than use an unexplained generic "verified" badge

### Listings

- Create and manage listings
- Photos
- Manual moderation before publication
- Approximate public location; full address remains private
- 45-day expiry with reminders at 7, 3 and 1 days
- Renewal when critical information is unchanged
- Mandatory close reason
- Critical edits return to moderation; minor edits do not

Critical changes include at least:
- price
- address
- advertiser/authorization basis
- availability
- other material offer changes

Minor changes include at least:
- copy corrections
- description improvements
- house-rule text
- photo ordering
- non-material presentation changes

### Listing information

Financial:
- rent
- deposit
- bills included or not
- estimated monthly bills when excluded
- first rent in advance when applicable
- estimated initial cost

Accommodation:
- property/accommodation type
- whole or shared property
- number of bedrooms
- number of bathrooms
- floor
- lift
- furnished
- heating type
- internet/Wi-Fi
- laundry
- general kitchen equipment
- outdoor space
- accessibility features
- parking for car, motorcycle and bicycle

Room/space:
- private or shared
- room type
- bed type
- capacity
- number of people sharing the room/space
- private/shared bathroom
- number of people sharing that bathroom

Household and rules:
- total residents
- descriptive gender composition of current household
- couple accepted
- pets accepted
- children/families accepted
- students accepted
- smoking permitted
- parties
- visitors
- quiet-hours / house rules

Tenancy requirements:
- availability date
- minimum stay
- proof of income requirement
- employment proof requirement
- previous landlord/agency reference requirement
- other objective rental requirements

Transport:
- nearby Bus / LUAS / DART / Train
- stop/station name when known
- approximate walking time

Not in Beta 1 as structured requirements:
- cleaning arrangements
- BER rating
- home-office/study workspace
- maximum move-in date
- short-term/long-term category separate from minimum stay
- agency/admin fee field

### Search and discovery

Essential filters:
- location
- maximum price
- accommodation type
- availability
- whole/shared property
- private/shared room or space
- private/shared bathroom
- bedrooms
- bathrooms
- resident count
- people sharing room
- people sharing bathroom
- couple
- pets
- children/families
- students
- smoking
- bills included
- furnished
- minimum stay

Sorting:
- recommended
- lowest price
- highest price
- newest

Views:
- list
- map
- approximate markers
- marker clustering
- search visible map area

Freehand polygon search is deferred.

### Favorites

- Simple favorite is P0

Advanced collections, collaboration and social features are deferred from the beta blocker set.

### Messaging

- One-to-one conversation tied to a listing
- Text
- Images
- PDF
- No message editing in Beta 1
- No delete-for-everyone in Beta 1
- Preserve conversation history according to the retention policy
- External contact details may be shared with safety warnings

### Visits

- Schedule inside conversation
- Parties choose date/time freely
- Overlap warning without blocking the booking
- No disclosure of another seeker's identity
- Post-visit state: happened, cancelled, no-show, rescheduled

### Trust and safety

Users can report:
- user
- listing
- message

Initial reasons:
- scam/fraud
- harassment
- discrimination
- fake listing
- spam
- offensive content
- other

Blocking:
- stops new communication
- hides blocked person's listings from blocker
- preserves existing history
- does not reveal blocker identity

Reports are signals, not proof. Ordinary reports must not trigger automatic punishment. High-risk cases may receive documented preventive suspension after evidence review.

Preventively suspended accounts remain read-only while under review.

### Admin

Single global Morada administrator for Beta 1.

Admin must be able to manage:
- users
- identity verification
- listing authorization documents
- listings
- approve/reject/request correction
- suspend/reactivate where permitted
- reports and blocks
- audit logs
- basic operational metrics

### Notifications

Configurable categories for non-critical notifications.

Initial important events include:
- new message
- visit changes
- moderation result/correction request
- listing expiry
- saved-search match when enabled
- relevant favorite change when enabled
- account/moderation/security decisions

Critical account and security notifications cannot be fully disabled.

### Platform and engineering

- Mobile: primary authenticated consumer product
- Public web: discovery, SEO and shared listing links
- Private web admin
- Staging and production environments
- CI gates: lint, typecheck, tests, build
- Backups, secret management and production-safe CORS
- Monitoring/observability appropriate for the beta

## P1 - Desirable during beta

- Saved searches
- Immediate or daily saved-search alerts
- Custom favorite lists
- Private favorite notes
- Shared favorite-list links
- Basic professional/organization support
- Expanded product analytics dashboard
- Further map and search refinements

## P2 - Immediate post-beta

- Collaborative favorite lists with owner + up to 10 collaborators
- Shared comments, reactions and shared listing statuses
- Ownership transfer for collaborative lists
- Full organization team model up to 10 users
- One organization admin plus members
- Member-specific listing responsibility and conversations
- Internal listing approval by organization admin
- Temporary substitutions
- Organization-wide operational pause
- Batch conversation redistribution
- Administrator transfer workflow
- Negotiation checklist controlled by advertiser

## P3 - Future

- Full accommodation exchange workflow
- Housing-wanted posts
- Compatibility percentage/matching
- Person and property ratings
- Automatic translation
- Automated KYC/identity tooling
- Payments, escrow or contracts
- Professional subscriptions
- Clearly identified promoted listings
- Advanced analytics
- BER integration/filtering

## Legal launch gate

Development may continue, but public/operational launch remains subject to professional validation of immigration status, legal structure, GDPR/data-controller responsibilities, platform terms, verification practices, retention and applicable housing/marketplace obligations.
