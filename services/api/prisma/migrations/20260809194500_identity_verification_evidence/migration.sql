-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('PASSPORT', 'EU_EEA_NATIONAL_ID', 'DRIVING_LICENCE', 'IRP');

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IdentityEvidenceType" AS ENUM ('DOCUMENT_FRONT', 'DOCUMENT_BACK', 'SELFIE_WITH_DOCUMENT');

-- CreateTable
CREATE TABLE "IdentityVerificationSubmission" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "documentType" "IdentityDocumentType" NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewReason" TEXT,
    "retainUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerificationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityVerificationEvidence" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "type" "IdentityEvidenceType" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerificationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerificationSubmission_verificationId_submittedAt_idx" ON "IdentityVerificationSubmission"("verificationId", "submittedAt");

-- CreateIndex
CREATE INDEX "IdentityVerificationSubmission_status_idx" ON "IdentityVerificationSubmission"("status");

-- CreateIndex
CREATE INDEX "IdentityVerificationSubmission_reviewedBy_idx" ON "IdentityVerificationSubmission"("reviewedBy");

-- CreateIndex
CREATE INDEX "IdentityVerificationSubmission_retainUntil_idx" ON "IdentityVerificationSubmission"("retainUntil");

-- CreateIndex
CREATE INDEX "IdentityVerificationSubmission_deletedAt_idx" ON "IdentityVerificationSubmission"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerificationEvidence_objectKey_key" ON "IdentityVerificationEvidence"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerificationEvidence_submissionId_type_key" ON "IdentityVerificationEvidence"("submissionId", "type");

-- CreateIndex
CREATE INDEX "IdentityVerificationEvidence_submissionId_idx" ON "IdentityVerificationEvidence"("submissionId");

-- CreateIndex
CREATE INDEX "IdentityVerificationEvidence_deletedAt_idx" ON "IdentityVerificationEvidence"("deletedAt");

-- AddForeignKey
ALTER TABLE "IdentityVerificationSubmission" ADD CONSTRAINT "IdentityVerificationSubmission_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationSubmission" ADD CONSTRAINT "IdentityVerificationSubmission_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationEvidence" ADD CONSTRAINT "IdentityVerificationEvidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "IdentityVerificationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
