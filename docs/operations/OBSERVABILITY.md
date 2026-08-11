# Beta 1 Observability and Health

## Health endpoints

Morada exposes two different health concepts:

- `GET /health/live` — process liveness only; it does not touch the database or storage.
- `GET /health/ready` — dependency readiness; it checks PostgreSQL plus the configured public and private storage boundaries.

For compatibility, `/health` maps to liveness and `/ready` maps to readiness.

Public health responses are deliberately minimal. They do not expose environment names, versions, database hosts, storage providers, filesystem paths, object keys or underlying error messages.

A successful readiness response is:

```json
{"status":"ready"}
```

A dependency failure returns HTTP 503 with:

```json
{"status":"not_ready"}
```

## Logging

The application uses structured JSON-style HTTP logging with request ID, method, path, status code and duration. Query-string values, IP address and user-agent are intentionally excluded from the Beta 1 request log contract.

Sensitive storage object keys and private evidence content must not be written to application logs.

## Operational use

A future deployment platform may use liveness to decide whether the process should be restarted and readiness to decide whether traffic should reach the process.

Readiness is not an uptime guarantee. It proves only that the application can currently reach the dependencies that are part of its configured readiness boundary.

## Alerting and external monitoring gate

No hosted APM, log aggregation, uptime monitor or alerting SaaS is activated by this repository work. Before a production beta, the operator should define alerts for at least:

- readiness failures;
- elevated HTTP 5xx rate;
- database/storage availability;
- backup failures;
- abnormal latency or resource exhaustion.

If the selected platform includes free/native health checks they can be reviewed later. Any monitoring or alerting service that may generate charges requires explicit owner approval before activation.
