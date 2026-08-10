# Search & discovery — Beta 1

## Eligibility

Public discovery is fail-closed. A listing is searchable only when all of the following are true:

- `Listing.status = ACTIVE`;
- `Listing.deletedAt IS NULL`;
- listing type is supported by Beta 1 (`RENTAL` or `TRANSFER`);
- `ListingLifecycle.expiresAt > now`.

Missing lifecycle metadata or an exact expiry boundary removes the listing from public discovery.

## Endpoint

`GET /discovery/listings`

The endpoint is public and returns bounded pagination (`limit <= 50`). Filters are server-side and composable.

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

## Public projection

Search intentionally selects only public discovery fields, including `ListingPublicLocation`. It does not load or return:

- `ListingPrivateLocation`;
- address lines or Eircode;
- exact latitude/longitude;
- authorization/identity evidence;
- storage object keys;
- moderation notes or rejection reasons.

The search response includes one ordered cover photo, approximate location metadata and the lifecycle `expiresAt` value needed by the client to avoid presenting stale inventory.

## Pagination

Pagination is page-based for Beta 1 with deterministic ordering and a hard limit of 50 items per page. Cursor pagination may replace it later if inventory size or query latency justifies the additional complexity.

## Cost posture

Beta 1 search uses PostgreSQL + Prisma already present in the project. No paid search SaaS, geocoding provider or analytics/search service is required for this implementation.
