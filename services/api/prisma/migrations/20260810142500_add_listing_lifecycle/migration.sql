-- CreateEnum
CREATE TYPE "ListingCloseReason" AS ENUM (
    'RENTED_VIA_MORADA',
    'CLOSED_OUTSIDE_MORADA',
    'STOPPED_ADVERTISING',
    'PROPERTY_UNAVAILABLE',
    'LISTING_MISTAKE',
    'OTHER'
);

-- CreateTable
CREATE TABLE "ListingLifecycle" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastRenewedAt" TIMESTAMP(3),
    "closeReason" "ListingCloseReason",
    "closeReasonDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingLifecycle_listingId_key" ON "ListingLifecycle"("listingId");

-- CreateIndex
CREATE INDEX "ListingLifecycle_expiresAt_idx" ON "ListingLifecycle"("expiresAt");

-- CreateIndex
CREATE INDEX "ListingLifecycle_closeReason_idx" ON "ListingLifecycle"("closeReason");

-- AddForeignKey
ALTER TABLE "ListingLifecycle"
ADD CONSTRAINT "ListingLifecycle_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill currently active inventory so the public visibility rule is deterministic
-- immediately after deployment. Existing publication time is preserved as the age anchor.
INSERT INTO "ListingLifecycle" (
    "id",
    "listingId",
    "expiresAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "id",
    COALESCE("publishedAt", "updatedAt", CURRENT_TIMESTAMP) + INTERVAL '45 days',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Listing"
WHERE "status" = 'ACTIVE'
  AND "deletedAt" IS NULL
ON CONFLICT ("listingId") DO NOTHING;
