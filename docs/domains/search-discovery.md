# Search & discovery — Beta 1

## Eligibility

Public discovery is fail-closed. A listing is discoverable only when all of the following are true:

- `Listing.status = ACTIVE`;
- `Listing.deletedAt IS NULL`;
- listing type is supported by Beta 1 (`RENTAL` or `TRANSFER`);
- `ListingLifecycle.expiresAt > now`.

Missing lifecycle metadata or an exact expiry boundary removes the listing from every discovery contract.

## Endpoints

### Search/cards

`GET /discovery/listings`

The endpoint is public and returns bounded pagination (`limit <= 50`). Each item is a compact card read model rather than a raw `Listing` entity.

The card contains only information needed for list/search UX:

- title and listing type;
- public city/area/county/postal district;
- approximate public map location;
- accommodation summary;
- monthly price/bills summary;
- selected suitability flags;
- availability summary;
- one ordered cover photo;
- trust score;
- publication and expiry timestamps.

### Public detail

`GET /discovery/listings/:id`

The detail endpoint uses the same eligibility boundary as search and adds the structured public attributes needed by the Beta 1 listing detail screen. It includes all ordered public photos, transport options, advertiser public profile fields and precise trust semantics.

Trust is never represented as a generic `safe` or `fully verified` claim. The detail distinguishes:

- advertiser identity verified;
- relationship to the property verified;
- landlord authorization verified or not verified, together with whether the listing requires it.

## Filters

Current essential filters include:

- county, city and area;
- listing/property type;
- whole/shared property and private/shared advertised space;
- bathroom type;
- maximum monthly price;
- bills included;
- desired availability date (`availableOn`);
- couples, pets, furnished and smoking flags;
- children/family and student flags;
- minimum bedroom/bathroom counts;
- maximum acceptable minimum-stay requirement.

Exclusionary incoming-tenant gender filtering is intentionally not part of the Beta 1 public search contract pending legal validation.

## Sorting

Supported sort modes:

- `RELEVANCE` — `trustScore DESC`, then `publishedAt DESC`, then stable `id ASC`;
- `PRICE_ASC` — price ascending, then publication date and stable ID;
- `PRICE_DESC` — price descending, then publication date and stable ID;
- `NEWEST` — `publishedAt DESC`, then stable `id ASC`.

`lastRenewedAt` is never used as a ranking freshness signal. Renewal extends listing validity without manufacturing a newer listing.

## Privacy boundary

Discovery uses dedicated Prisma selects rather than loading full listing domain objects and stripping fields afterward. Public selects do not load or return:

- `ListingPrivateLocation`;
- address lines or Eircode;
- exact latitude/longitude;
- identity or authorization evidence files;
- storage object keys;
- moderation notes, rejection reasons or correction reasons;
- private user identity fields such as full legal name or date of birth.

Public advertiser data is limited to presentation fields intentionally allowed for discovery. Approximate location always comes from `ListingPublicLocation`.

## Pagination

Pagination is page-based for Beta 1 with deterministic ordering and a hard limit of 50 items per page. Cursor pagination may replace it later if inventory size or query latency justifies the additional complexity.

## Cost posture

Beta 1 search/read models use PostgreSQL + Prisma already present in the project. No paid search SaaS, geocoding provider or analytics/search service is required for this implementation.
