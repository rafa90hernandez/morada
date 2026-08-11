# Beta 1 Admin Operations

## Purpose

The Beta 1 admin control plane consolidates pending operational work without replacing the existing domain-specific review and moderation services.

`GET /api/v1/admin/operations/summary` is an authenticated admin-only read model protected by the same `JwtAuthGuard` + database-backed `AdminGuard` used by the existing admin surfaces.

## What the summary contains

The response exposes counts and up to 10 oldest items for:

- identity verification reviews;
- listing authorization reviews;
- listing moderation reviews;
- open/under-review safety reports.

Each preview contains only the minimum fields needed to identify and route the work item. The response also points operators to the existing detailed review routes where decisions continue to be made.

## Privacy boundary

The consolidated summary intentionally does not expose:

- identity or listing evidence;
- private storage object keys;
- exact/private listing addresses;
- user email addresses;
- report descriptions;
- admin report notes;
- message bodies or attachment metadata.

Sensitive evidence remains accessible only through the dedicated audited evidence-read endpoints.

## Operational workflow

1. Read `/api/v1/admin/operations/summary` to understand pending workload.
2. Open the corresponding domain-specific review route.
3. Perform evidence reads only where necessary; those reads remain audited by the existing services.
4. Submit approval/rejection/correction/report decisions through the existing domain-specific endpoints.
5. Refresh the summary to confirm the pending queue changed.

The consolidated surface is read-only by design. It does not duplicate business transitions or create alternate moderation paths.

## Scaling boundary

Summary previews are bounded to 10 deterministic oldest-first records per queue. The totals are independent counts, so operators can see when a queue exceeds the preview. Domain-specific pagination can be added when real Beta 1 queue volume demonstrates the need; the summary itself remains bounded.
