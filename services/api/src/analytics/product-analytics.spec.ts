jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ProductEventType } from '../generated/prisma/enums';
import { recordProductEventSafely } from './product-analytics';

describe('recordProductEventSafely', () => {
  it('persists only the allowlisted search event fields', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-id' });
    const database = { productEvent: { create } };
    const occurredAt = new Date('2026-08-11T07:20:00.000Z');

    await expect(
      recordProductEventSafely(database as never, {
        type: ProductEventType.SEARCH_PERFORMED,
        occurredAt,
      }),
    ).resolves.toBe(true);

    expect(create).toHaveBeenCalledWith({
      data: {
        type: ProductEventType.SEARCH_PERFORMED,
        occurredAt,
        schemaVersion: 1,
      },
      select: { id: true },
    });

    const serialized = JSON.stringify(create.mock.calls);
    expect(serialized).not.toContain('metadata');
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('listingId');
    expect(serialized).not.toContain('message');
    expect(serialized).not.toContain('address');
    expect(serialized).not.toContain('report');
    expect(serialized).not.toContain('objectKey');
  });

  it('does not break the product flow when analytics storage is unavailable', async () => {
    const create = jest
      .fn()
      .mockRejectedValue(new Error('analytics unavailable'));
    const database = { productEvent: { create } };

    await expect(
      recordProductEventSafely(database as never, {
        type: ProductEventType.SEARCH_PERFORMED,
      }),
    ).resolves.toBe(false);
  });
});
