# Morada

Morada is a modern housing platform focused on rentals, room sharing and accommodation exchange.

## Environment

Copy `.env.example` to `.env` for local development.

Required configuration:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGINS=
```

### Environment rules

- `NODE_ENV` accepts `development`, `test`, `staging` or `production`.
- `DATABASE_URL` is always required.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are always required and must each contain at least 32 characters. Use independent high-entropy values and inject real secrets through the deployment platform; do not commit them.
- `CORS_ORIGINS` is optional in `development` and `test`, where browser origins remain permissive for local tooling.
- `CORS_ORIGINS` is required in `staging` and `production`. It is a comma-separated allowlist of exact HTTP(S) origins, for example `https://morada.ie,https://app.morada.ie`. Paths, query strings, credentials and non-HTTP protocols are rejected.
- `.env`, `.env.local` and environment-specific local secret files are gitignored. `.env.example` contains names/examples only and must never contain real credentials.

### Current API protection defaults

- JSON and URL-encoded request bodies are limited to `1mb`.
- Global throttling currently uses three windows: 5 requests/second, 30 requests/10 seconds and 120 requests/minute.
- Helmet is enabled. Production uses Helmet's content-security-policy defaults; local environments disable CSP to avoid interfering with developer tooling.
- DTO validation uses whitelist mode and rejects non-whitelisted fields.

These defaults are the Beta 1 baseline and should be reviewed using staging traffic before public launch rather than weakened pre-emptively.

## Run

```bash
docker compose up -d

cd services/api

pnpm install
pnpm prisma generate
pnpm prisma db push
pnpm start:dev
```

## Quality

From the repository root:

```bash
pnpm generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm quality
```

Pull requests and pushes to `main` run the quality pipeline in GitHub Actions.

## Backend Features

### Security
- JWT Authentication
- Refresh Token Rotation
- Database-backed administrator authorization
- Helmet
- Environment-aware CORS allowlist
- Rate Limiting
- Payload Size Limit
- DTO Validation

### Observability
- Health Check
- Readiness Check
- Request ID
- Response Time
- HTTP Logging

### API
- Swagger
- Global Exception Filter
- Standard Response Format
