import { NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { ListingsService } from './listings.service';

describe('ListingsService authorization boundaries', () => {
  const findFirst = jest.fn();
  const update = jest.fn();

  const database = {
    listing: {
      findFirst,
      update,
    },
  } as unknown as DatabaseService;

  const service = new ListingsService(database);

  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue(null);
  });

  it('scopes owner reads by both authenticated user ID and listing ID', async () => {
    await expect(
      service.findMineById('authenticated-user', 'listing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'listing-id',
          userId: 'authenticated-user',
          deletedAt: null,
        },
      }),
    );
  });

  it('does not update a listing when the owner-scoped lookup fails', async () => {
    await expect(
      service.update('authenticated-user', 'someone-elses-listing', {
        title: 'Attempted change',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'someone-elses-listing',
          userId: 'authenticated-user',
          deletedAt: null,
        },
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });
});
