import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import type { CreateListingPhotoInput } from './types/listing-photo.types';

@Injectable()
export class ListingPhotosRepository {
  constructor(private readonly database: DatabaseService) {}

  async countByListingId(listingId: string): Promise<number> {
    return this.database.listingPhoto.count({
      where: {
        listingId,
      },
    });
  }

  async findNextPosition(listingId: string): Promise<number> {
    const result = await this.database.listingPhoto.aggregate({
      where: {
        listingId,
      },
      _max: {
        position: true,
      },
    });

    return result._max.position === null ? 0 : result._max.position + 1;
  }

  async create(input: CreateListingPhotoInput) {
    return this.database.listingPhoto.create({
      data: {
        id: input.id,
        listingId: input.listingId,
        objectKey: input.objectKey,
        url: input.url,
        position: input.position,
        width: input.width,
        height: input.height,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
      },
    });
  }

  async findByIdAndListingId(photoId: string, listingId: string) {
    return this.database.listingPhoto.findFirst({
      where: {
        id: photoId,
        listingId,
      },
    });
  }

  async findAllByListingId(listingId: string) {
    return this.database.listingPhoto.findMany({
      where: {
        listingId,
      },
      orderBy: {
        position: 'asc',
      },
    });
  }

  async deleteById(photoId: string): Promise<void> {
    await this.database.listingPhoto.delete({
      where: {
        id: photoId,
      },
    });
  }
}
