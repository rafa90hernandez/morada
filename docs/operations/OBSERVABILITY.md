# Beta 1 observability and health readiness

Morada Beta 1 keeps health diagnostics provider-agnostic and privacy-minimized.

## Endpoints

- `GET /api/v1/health/live` reports only `{ "status": "ok" }` when the application process is alive. It does not query dependencies.
- `GET /api/v1/health/ready` returns `{ "status": "ready" }` only when PostgreSQL responds and both configured storage adapters are available through dependency injection. It returns HTTP 503 with `{ "status": "unavailable" }` on dependency failure.

Neither response exposes hostnames, database names, credentials, provider names, storage keys, stack traces or internal topology.

## Logging boundary

The request logger already records only request ID, method, route, status and duration. Authorization headers, tokens, bodies, exact addresses, evidence keys, message content and report content must never be added to request logs.

## Storage readiness

Health checks intentionally do not upload/delete probe objects. Writing storage probes on every readiness request would create side effects and operational garbage. Provider construction/configuration is the non-destructive storage readiness signal in Beta 1. The production private-storage boundary remains fail-closed: local private storage is not allowed outside development/test.

## External monitoring gate

No APM, hosted logging, alerting or uptime vendor is activated by this change. A production deployment may later route these health endpoints and structured logs to an approved provider, but any service with potential cost requires owner approval first.
