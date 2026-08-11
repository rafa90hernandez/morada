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

CREATE OR REPLACE FUNCTION "morada_notification_id"(prefix TEXT, entity_id TEXT, suffix TEXT DEFAULT '')
RETURNS TEXT AS $$
BEGIN
  RETURN prefix || ':' || entity_id || ':' || suffix || ':' || substr(md5(random()::text || clock_timestamp()::text || entity_id), 1, 20);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "notify_new_message"()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id TEXT;
BEGIN
  SELECT CASE
    WHEN c."participantAId" = NEW."senderId" THEN c."participantBId"
    ELSE c."participantAId"
  END
  INTO recipient_id
  FROM "Conversation" c
  WHERE c."id" = NEW."conversationId";

  IF recipient_id IS NOT NULL THEN
    INSERT INTO "InAppNotification" (
      "id", "userId", "type", "title", "body", "targetType", "targetId", "metadata", "createdAt"
    ) VALUES (
      "morada_notification_id"('message', NEW."id", 'new'),
      recipient_id,
      'NEW_MESSAGE',
      'New message',
      'You have a new message.',
      'CONVERSATION',
      NEW."conversationId",
      jsonb_build_object('messageId', NEW."id"),
      NEW."createdAt"
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Message_in_app_notification"
AFTER INSERT ON "Message"
FOR EACH ROW EXECUTE FUNCTION "notify_new_message"();

CREATE OR REPLACE FUNCTION "notify_visit_event"()
RETURNS TRIGGER AS $$
DECLARE
  notification_type "InAppNotificationType";
  notification_title TEXT;
  notification_body TEXT;
  recipient_id TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    notification_type := 'VISIT_PROPOSED';
    notification_title := 'Visit proposed';
    notification_body := 'A new visit time was proposed.';
    recipient_id := NEW."responderId";
  ELSIF OLD."status" IS DISTINCT FROM NEW."status" THEN
    CASE NEW."status"
      WHEN 'ACCEPTED' THEN
        notification_type := 'VISIT_ACCEPTED';
        notification_title := 'Visit accepted';
        notification_body := 'Your proposed visit was accepted.';
        recipient_id := NEW."requesterId";
      WHEN 'DECLINED' THEN
        notification_type := 'VISIT_DECLINED';
        notification_title := 'Visit declined';
        notification_body := 'Your proposed visit was declined.';
        recipient_id := NEW."requesterId";
      WHEN 'REPLACED' THEN
        notification_type := 'VISIT_REPLACED';
        notification_title := 'New visit time proposed';
        notification_body := 'The previous visit proposal was replaced with a new time.';
        recipient_id := NEW."requesterId";
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO "InAppNotification" (
    "id", "userId", "type", "title", "body", "targetType", "targetId", "metadata", "createdAt"
  ) VALUES (
    "morada_notification_id"('visit', NEW."id", NEW."status"::text),
    recipient_id,
    notification_type,
    notification_title,
    notification_body,
    'VISIT',
    NEW."id",
    jsonb_build_object('startsAt', NEW."startsAt", 'endsAt', NEW."endsAt"),
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Visit_in_app_notification_insert"
AFTER INSERT ON "Visit"
FOR EACH ROW EXECUTE FUNCTION "notify_visit_event"();

CREATE TRIGGER "Visit_in_app_notification_update"
AFTER UPDATE OF "status" ON "Visit"
FOR EACH ROW EXECUTE FUNCTION "notify_visit_event"();

CREATE OR REPLACE FUNCTION "notify_report_resolution"()
RETURNS TRIGGER AS $$
DECLARE
  notification_type "InAppNotificationType";
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  IF OLD."status" IS NOT DISTINCT FROM NEW."status" THEN
    RETURN NEW;
  END IF;

  IF NEW."status" = 'RESOLVED' THEN
    notification_type := 'REPORT_RESOLVED';
    notification_title := 'Report reviewed';
    notification_body := 'Your safety report has been reviewed and resolved.';
  ELSIF NEW."status" = 'DISMISSED' THEN
    notification_type := 'REPORT_DISMISSED';
    notification_title := 'Report reviewed';
    notification_body := 'Your safety report review is complete.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO "InAppNotification" (
    "id", "userId", "type", "title", "body", "targetType", "targetId", "createdAt"
  ) VALUES (
    "morada_notification_id"('report', NEW."id", NEW."status"::text),
    NEW."reporterId",
    notification_type,
    notification_title,
    notification_body,
    'REPORT',
    NEW."id",
    CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Report_in_app_notification"
AFTER UPDATE OF "status" ON "Report"
FOR EACH ROW EXECUTE FUNCTION "notify_report_resolution"();

CREATE OR REPLACE FUNCTION "notify_listing_paused"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" IS DISTINCT FROM NEW."status" AND NEW."status" = 'PAUSED' THEN
    INSERT INTO "InAppNotification" (
      "id", "userId", "type", "title", "body", "targetType", "targetId", "createdAt"
    ) VALUES (
      "morada_notification_id"('listing', NEW."id", 'paused'),
      NEW."userId",
      'LISTING_PAUSED',
      'Listing paused',
      'Your listing is currently paused. Open it for the latest status.',
      'LISTING',
      NEW."id",
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Listing_paused_in_app_notification"
AFTER UPDATE OF "status" ON "Listing"
FOR EACH ROW EXECUTE FUNCTION "notify_listing_paused"();
