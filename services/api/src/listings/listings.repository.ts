import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import type { ListingOwnershipResult } from './types/listing-ownership.types';

@Injectable()
export class ListingsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findOwnershipById(
    listingId: string,
  ): Promise<ListingOwnershipResult | null> {
    return this.database.listing.findUnique({
      where: {
        id: listingId,
      },
      select: {
        id: true,
        userId: true,
      },
    });
  }
}
