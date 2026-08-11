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

### Approximate map / visible area

`GET /discovery/map?north=...&south=...&east=...&west=...`

The map endpoint is provider-agnostic and returns only approximate marker positions from `ListingPublicLocation`. It never loads `ListingPrivateLocation`.

The viewport contract is deliberately bounded:

- latitude and longitude values must be valid geographic coordinates;
- `north` must be greater than `south`;
- `east` must be greater than `west` in the Beta 1 contract;
- maximum latitude span is 5 degrees;
- maximum longitude span is 6 degrees;
- response limit defaults to 200 and is capped at 500 markers.

The service requests one extra row to report `truncated = true` without returning more than the requested limit. Marker ordering is deterministic by listing ID, making list/map synchronization predictable for Beta 1.

Markers include only listing ID, approximate latitude/longitude, approximation radius/version and the compact label data required by the client. Client-side clustering can be implemented without a paid map/search backend.

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

The map endpoint queries `ListingPublicLocation` directly and only joins the minimal public listing label fields. Exact address, Eircode and exact coordinates therefore do not enter the query result at all.

## Pagination

Pagination is page-based for Beta 1 with deterministic ordering and a hard limit of 50 items per page. Cursor pagination may replace it later if inventory size or query latency justifies the additional complexity.

## Cost posture

Beta 1 search/read/map contracts use PostgreSQL + Prisma already present in the project. No paid search SaaS, geocoding provider, map backend or analytics/search service is required for this implementation.
