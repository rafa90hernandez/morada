-- CreateEnum
CREATE TYPE "ListingAuthorizationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ListingAuthorizationEvidenceType" AS ENUM ('TENANCY_AGREEMENT', 'LANDLORD_AUTHORIZATION', 'PROOF_OF_OWNERSHIP', 'AGENCY_MANDATE', 'OTHER_SUPPORTING_DOCUMENT');

-- CreateTable
CREATE TABLE "ListingAuthorizationSubmission" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "ListingAuthorizationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewReason" TEXT,
    "relationshipVerified" BOOLEAN,
    "landlordAuthorizationVerified" BOOLEAN,
    "retainUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingAuthorizationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAuthorizationEvidence" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "ListingAuthorizationEvidenceType" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "originalFileName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingAuthorizationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingAuthorizationSubmission_listingId_submittedAt_idx" ON "ListingAuthorizationSubmission"("listingId", "submittedAt");

-- CreateIndex
CREATE INDEX "ListingAuthorizationSubmission_status_idx" ON "ListingAuthorizationSubmission"("status");

-- CreateIndex
CREATE INDEX "ListingAuthorizationSubmission_reviewedBy_idx" ON "ListingAuthorizationSubmission"("reviewedBy");

-- CreateIndex
CREATE INDEX "ListingAuthorizationSubmission_retainUntil_idx" ON "ListingAuthorizationSubmission"("retainUntil");

-- CreateIndex
CREATE INDEX "ListingAuthorizationSubmission_deletedAt_idx" ON "ListingAuthorizationSubmission"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingAuthorizationEvidence_objectKey_key" ON "ListingAuthorizationEvidence"("objectKey");

-- CreateIndex
CREATE INDEX "ListingAuthorizationEvidence_submissionId_idx" ON "ListingAuthorizationEvidence"("submissionId");

-- CreateIndex
CREATE INDEX "ListingAuthorizationEvidence_type_idx" ON "ListingAuthorizationEvidence"("type");

-- CreateIndex
CREATE INDEX "ListingAuthorizationEvidence_deletedAt_idx" ON "ListingAuthorizationEvidence"("deletedAt");

-- AddForeignKey
ALTER TABLE "ListingAuthorizationSubmission" ADD CONSTRAINT "ListingAuthorizationSubmission_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAuthorizationSubmission" ADD CONSTRAINT "ListingAuthorizationSubmission_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAuthorizationEvidence" ADD CONSTRAINT "ListingAuthorizationEvidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ListingAuthorizationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
