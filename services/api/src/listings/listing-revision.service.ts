import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';

@Injectable()
export class ListingRevisionService {
  constructor(private readonly database: DatabaseService) {}

  async listForAdmin(listingId: string) {
    const listing = await this.database.listing.findFirst({
      where: {
        id: listingId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return this.database.listingRevision.findMany({
      where: {
        listingId,
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
  }
}
