CREATE TYPE "ProductEventType" AS ENUM (
  'SEARCH_PERFORMED',
  'LISTING_PUBLISHED',
  'CONVERSATION_STARTED',
  'VISIT_ACCEPTED',
  'VISIT_COMPLETED',
  'VISIT_NO_SHOW',
  'LISTING_CLOSED'
);

CREATE TABLE "ProductEvent" (
  "id" TEXT NOT NULL,
  "type" "ProductEventType" NOT NULL,
  "listingId" TEXT,
  "conversationId" TEXT,
  "visitId" TEXT,
  "dedupeKey" TEXT,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductEvent_dedupeKey_key"
  ON "ProductEvent"("dedupeKey");
CREATE INDEX "ProductEvent_type_occurredAt_idx"
  ON "ProductEvent"("type", "occurredAt");
CREATE INDEX "ProductEvent_occurredAt_idx"
  ON "ProductEvent"("occurredAt");
CREATE INDEX "ProductEvent_listingId_occurredAt_idx"
  ON "ProductEvent"("listingId", "occurredAt");
CREATE INDEX "ProductEvent_conversationId_occurredAt_idx"
  ON "ProductEvent"("conversationId", "occurredAt");
CREATE INDEX "ProductEvent_visitId_occurredAt_idx"
  ON "ProductEvent"("visitId", "occurredAt");
