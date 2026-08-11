CREATE TYPE "ProductEventType" AS ENUM ('SEARCH_PERFORMED');

CREATE TABLE "ProductEvent" (
  "id" TEXT NOT NULL,
  "type" "ProductEventType" NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductEvent_type_occurredAt_idx"
  ON "ProductEvent"("type", "occurredAt");
CREATE INDEX "ProductEvent_occurredAt_idx"
  ON "ProductEvent"("occurredAt");
