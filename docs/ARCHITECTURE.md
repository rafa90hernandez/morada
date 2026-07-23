# Morada Architecture

## Overview

Morada is a pnpm/Turborepo monorepo for a housing platform focused on Brazilians living in Ireland.

## Workspace layout

The workspace is divided into:

- `apps/*`: user-facing applications
- `services/*`: backend and supporting services
- `packages/*`: reusable libraries and shared configuration

The backend currently lives in `services/api` and is implemented with NestJS, Prisma and PostgreSQL.

## API bootstrap

The API uses:

- global route prefix: `/api/v1`
- global DTO validation with whitelist and rejection of unknown fields
- Helmet
- response compression
- request body limits
- global response interceptors
- global exception handling
- request IDs and request logging
- Swagger documentation
- global throttling

## Backend modules

The root API module currently composes:

- `AuthModule`
- `UsersModule`
- `ListingsModule`
- `ListingPhotosModule`
- `StorageModule`
- `DatabaseModule`

## Data layer

Prisma is configured for PostgreSQL. The schema already models the main platform domains:

- users and profiles
- verification and trust score
- listings and listing photos
- exchange preferences
- favorites
- conversations and messages
- reports and blocks
- notifications
- admin action logs

## Listings lifecycle

The implemented lifecycle is centered around moderation:

1. A listing is created as `PENDING_REVIEW`.
2. Approved listings become `ACTIVE`.
3. Owners may pause active listings.
4. Paused listings may be reactivated.
5. Rejected listings may be resubmitted.
6. Listings may be closed or soft-deleted.
7. Editing an owner listing returns it to moderation.

Public listing reads must only expose active, non-deleted listings.

## Engineering boundaries

- Controllers handle HTTP concerns and delegate business logic.
- DTOs validate request shape.
- Services enforce business rules and orchestrate persistence.
- Mappers control public and owner-facing response shapes.
- Prisma access is centralized through `DatabaseService`.

## Current audit priorities

1. Align the Prisma listing status enum with the no-draft product decision.
2. Standardize `@CurrentUser('id')` in authenticated controllers.
3. Remove redundant ownership checks after owner-scoped queries.
4. Strengthen text validation and field limits in listing DTOs.
5. Restrict production CORS to configured trusted origins.
6. Add meaningful root workspace scripts and CI checks.
7. Expand automated tests for listing state transitions.
