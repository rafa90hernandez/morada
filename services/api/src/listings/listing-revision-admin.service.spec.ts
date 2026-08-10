import { NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { ListingRevisionService } from './listing-revision.service';

describe('ListingRevisionService admin reads', () => {
  const listingFindFirst = jest.fn();
  const revisionFindMany = jest.fn();
  const database = {
    listing: {
      findFirst: listingFindFirst,
    },
    listingRevision: {
      findMany: revisionFindMany,
    },
  };
  const service = new ListingRevisionService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns revisions newest first with explicit audit fields', async () => {
    listingFindFirst.mockResolvedValueOnce({ id: 'listing-id' });
    revisionFindMany.mockResolvedValueOnce([]);

    await service.listForAdmin('listing-id');

    expect(revisionFindMany).toHaveBeenCalledWith({
      where: {
        listingId: 'listing-id',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        listingId: true,
        actorUserId: true,
        classification: true,
        changedFields: true,
        before: true,
        after: true,
        statusBefore: true,
        statusAfter: true,
        previousPublishedAt: true,
        createdAt: true,
      },
    });
  });

  it('does not expose revision history for a missing or deleted listing', async () => {
    listingFindFirst.mockResolvedValueOnce(null);

    await expect(service.listForAdmin('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(revisionFindMany).not.toHaveBeenCalled();
  });
});
