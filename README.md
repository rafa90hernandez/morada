# Morada

Morada is a modern housing platform focused on rentals, room sharing and accommodation exchange.

## Environment

Copy `.env.example` to `.env`.

Then configure:

```env
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

## Run

```bash
docker compose up -d

cd services/api

pnpm install
pnpm prisma generate
pnpm prisma db push
pnpm start:dev
```
## Backend Features

### Security
- JWT Authentication
- Refresh Token Rotation
- Helmet
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