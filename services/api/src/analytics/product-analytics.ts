import { Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ProductEventType } from '../generated/prisma/enums';

const logger = new Logger('ProductAnalytics');

type ProductEventInput = {
  type: ProductEventType;
  occurredAt?: Date;
};

type ProductEventDelegate = {
  create(args: unknown): Promise<unknown>;
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

  try {
    await productEvent.create({
      data: {
        type: event.type,
        occurredAt: event.occurredAt,
        schemaVersion: 1,
      },
      select: { id: true },
    });

    return true;
  } catch {
    logger.warn(`Product analytics event ${event.type} could not be recorded.`);
    return false;
  }
}
