# Morada Mobile

Aplicativo Expo/React Native do Morada.

## Beta 1 discovery flow

The current mobile slice consumes the public discovery contracts from Sprint 4:

- `GET /api/v1/discovery/listings`
- `GET /api/v1/discovery/listings/:id`
- `GET /api/v1/discovery/map`
- authenticated favorites API is wired at client level but remains disabled in the UI until the mobile authentication session is connected.

The app currently provides:

- Portuguese-first accommodation search/list screen;
- city, maximum-price and furnished filters;
- loading, empty, refresh and error states;
- privacy-safe listing cards and detail screen;
- precise trust wording rather than a generic safety badge;
- list/map mode using only approximate public coordinates;
- a provider-free schematic map shell so Beta 1 development does not require a paid maps SDK or tile service.

## API configuration

Set the public API base URL through Expo's public environment variable:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

A physical device cannot normally reach a development server through `localhost`; use the machine's LAN address for local device testing.

## Commands

From the repository root:

```bash
pnpm dev:mobile
pnpm typecheck:mobile
pnpm --filter @morada/mobile test
pnpm --filter @morada/mobile build
```

## Privacy boundary

The mobile app consumes only the backend discovery read models. It does not request or model private addresses, Eircodes, exact coordinates, identity evidence object keys or listing-authorization documents.

The map shell explicitly labels positions as approximate. A production map/tile provider is intentionally not selected in this sprint; any provider that can introduce usage charges must be reviewed and approved before activation.
