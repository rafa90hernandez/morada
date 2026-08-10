-- CreateEnum
CREATE TYPE "ListingRevisionClassification" AS ENUM ('CRITICAL', 'MINOR');

-- CreateTable
CREATE TABLE "ListingRevision" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "classification" "ListingRevisionClassification" NOT NULL,
    "changedFields" TEXT[],
    "before" JSONB,
    "after" JSONB,
    "statusBefore" "ListingStatus" NOT NULL,
    "statusAfter" "ListingStatus" NOT NULL,
    "previousPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingRevision_listingId_createdAt_idx" ON "ListingRevision"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingRevision_actorUserId_createdAt_idx" ON "ListingRevision"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ListingRevision_classification_idx" ON "ListingRevision"("classification");

-- CreateIndex
CREATE INDEX "ListingRevision_statusBefore_idx" ON "ListingRevision"("statusBefore");

-- CreateIndex
CREATE INDEX "ListingRevision_statusAfter_idx" ON "ListingRevision"("statusAfter");
