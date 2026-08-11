-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'REPLACED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "replacementForId" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'PROPOSED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "outcomeAt" TIMESTAMP(3),
    "outcomeById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_listingId_startsAt_idx" ON "Visit"("listingId", "startsAt");
CREATE INDEX "Visit_conversationId_createdAt_idx" ON "Visit"("conversationId", "createdAt");
CREATE INDEX "Visit_requesterId_startsAt_idx" ON "Visit"("requesterId", "startsAt");
CREATE INDEX "Visit_responderId_startsAt_idx" ON "Visit"("responderId", "startsAt");
CREATE INDEX "Visit_status_startsAt_idx" ON "Visit"("status", "startsAt");
CREATE INDEX "Visit_replacementForId_idx" ON "Visit"("replacementForId");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_replacementForId_fkey" FOREIGN KEY ("replacementForId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_outcomeById_fkey" FOREIGN KEY ("outcomeById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
