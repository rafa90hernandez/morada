import { Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ProductEventType } from '../generated/prisma/enums';

const logger = new Logger('ProductAnalytics');

type ProductEventInput = {
  type: ProductEventType;
  listingId?: string;
  conversationId?: string;
  visitId?: string;
  dedupeKey?: string;
  occurredAt?: Date;
};

type ProductEventDelegate = {
  create(args: unknown): Promise<unknown>;
  upsert(args: unknown): Promise<unknown>;
};

export async function recordProductEventSafely(
  database: DatabaseService,
  event: ProductEventInput,
): Promise<boolean> {
  const productEvent = (
    database as unknown as { productEvent?: ProductEventDelegate }
  ).productEvent;

  if (!productEvent) {
    return false;
  }

  const data = {
    type: event.type,
    listingId: event.listingId,
    conversationId: event.conversationId,
    visitId: event.visitId,
    dedupeKey: event.dedupeKey,
    occurredAt: event.occurredAt,
    schemaVersion: 1,
  };

  try {
    if (event.dedupeKey) {
      await productEvent.upsert({
        where: { dedupeKey: event.dedupeKey },
        create: data,
        update: {},
        select: { id: true },
      });
    } else {
      await productEvent.create({
        data,
        select: { id: true },
      });
    }

    return true;
  } catch {
    logger.warn(`Product analytics event ${event.type} could not be recorded.`);
    return false;
  }
}
