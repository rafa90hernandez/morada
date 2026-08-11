CREATE TYPE "InAppNotificationType" AS ENUM (
  'NEW_MESSAGE',
  'VISIT_PROPOSED',
  'VISIT_ACCEPTED',
  'VISIT_DECLINED',
  'VISIT_REPLACED',
  'VISIT_CANCELLED',
  'REPORT_RESOLVED',
  'REPORT_DISMISSED',
  'LISTING_PAUSED'
);

CREATE TABLE "InAppNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "InAppNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "targetType" TEXT,
  "targetId" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId", "createdAt");
CREATE INDEX "InAppNotification_userId_isRead_idx" ON "InAppNotification"("userId", "isRead");
CREATE INDEX "InAppNotification_targetType_targetId_idx" ON "InAppNotification"("targetType", "targetId");
