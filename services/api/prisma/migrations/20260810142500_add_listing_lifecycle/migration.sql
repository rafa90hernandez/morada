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

-- Keep publication validity atomic with Listing.ACTIVE transitions. Re-activating a
-- paused listing does not create extra freshness because the existing publishedAt
-- remains the age anchor. A new moderation approval receives a new publishedAt and,
-- therefore, a new deterministic 45-day validity window.
CREATE OR REPLACE FUNCTION "sync_listing_active_lifecycle"()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."status" = 'ACTIVE' THEN
        INSERT INTO "ListingLifecycle" (
            "id",
            "listingId",
            "expiresAt",
            "createdAt",
            "updatedAt"
        )
        VALUES (
            NEW."id",
            NEW."id",
            COALESCE(NEW."publishedAt", CURRENT_TIMESTAMP) + INTERVAL '45 days',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT ("listingId") DO UPDATE
        SET
            "expiresAt" = EXCLUDED."expiresAt",
            "closeReason" = NULL,
            "closeReasonDetail" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Listing_active_lifecycle_trigger"
AFTER INSERT OR UPDATE OF "status", "publishedAt" ON "Listing"
FOR EACH ROW
WHEN (NEW."status" = 'ACTIVE')
EXECUTE FUNCTION "sync_listing_active_lifecycle"();
