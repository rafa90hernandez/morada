import { Inject, Injectable } from '@nestjs/common';

import type { StorageService } from '../common/storage/storage.interface';
import { STORAGE_SERVICE } from '../common/storage/storage.tokens';
import type {
  ProcessedListingImage,
  StoredListingPhotoObject,
} from './types/listing-photo.types';

interface StoreListingPhotoInput {
  listingId: string;
  photoId: string;
  image: ProcessedListingImage;
}

@Injectable()
export class ListingPhotoStorageService {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async store(
    input: StoreListingPhotoInput,
  ): Promise<StoredListingPhotoObject> {
    const objectKey = this.buildObjectKey(input.listingId, input.photoId);

    const storedObject = await this.storageService.upload({
      key: objectKey,
      body: input.image.buffer,
      contentType: input.image.mimeType,
    });

    return {
      objectKey: storedObject.key,
      url: storedObject.url,
    };
  }

  async delete(objectKey: string): Promise<void> {
    await this.storageService.delete({
      key: objectKey,
    });
  }

  private buildObjectKey(listingId: string, photoId: string): string {
    return `listings/${listingId}/${photoId}.webp`;
  }
}
