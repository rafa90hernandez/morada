import { randomUUID } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { ListingsRepository } from '../listings/listings.repository';
import { ListingPhotoImageProcessor } from './listing-photo-image.processor';
import { ListingPhotoStorageService } from './listing-photo-storage.service';
import { ListingPhotosRepository } from './listing-photos.repository';
import type { UploadListingPhotoCommand } from './types/listing-photo.types';

@Injectable()
export class ListingPhotosService {
  private static readonly MAX_PHOTOS_PER_LISTING = 20;

  private readonly logger = new Logger(ListingPhotosService.name);

  constructor(
    private readonly listingsRepository: ListingsRepository,
    private readonly listingPhotosRepository: ListingPhotosRepository,
    private readonly imageProcessor: ListingPhotoImageProcessor,
    private readonly photoStorage: ListingPhotoStorageService,
  ) {}

  async upload(command: UploadListingPhotoCommand) {
    await this.validateListingOwnership(
      command.listingId,
      command.authenticatedUserId,
    );

    await this.validatePhotoLimit(command.listingId);

    const processedImage = await this.imageProcessor.process(command);

    const photoId = randomUUID();

    const position = await this.listingPhotosRepository.findNextPosition(
      command.listingId,
    );

    const storedObject = await this.photoStorage.store({
      listingId: command.listingId,
      photoId,
      image: processedImage,
    });

    try {
      return await this.listingPhotosRepository.create({
        id: photoId,
        listingId: command.listingId,
        objectKey: storedObject.objectKey,
        url: storedObject.url,
        position,
        width: processedImage.width,
        height: processedImage.height,
        sizeBytes: processedImage.sizeBytes,
        mimeType: processedImage.mimeType,
      });
    } catch (error: unknown) {
      await this.rollbackStoredObject(storedObject.objectKey);

      throw error;
    }
  }

  async validateListingOwnership(
    listingId: string,
    authenticatedUserId: string,
  ): Promise<void> {
    const listing = await this.listingsRepository.findOwnershipById(listingId);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== authenticatedUserId) {
      throw new ForbiddenException(
        'You are not allowed to manage photos for this listing',
      );
    }
  }

  async validatePhotoLimit(listingId: string): Promise<void> {
    const currentPhotoCount =
      await this.listingPhotosRepository.countByListingId(listingId);

    if (currentPhotoCount >= ListingPhotosService.MAX_PHOTOS_PER_LISTING) {
      throw new ForbiddenException(
        `A listing can have a maximum of ${ListingPhotosService.MAX_PHOTOS_PER_LISTING} photos`,
      );
    }
  }

  async findAll(listingId: string) {
    return this.listingPhotosRepository.findAllByListingId(listingId);
  }

  private async rollbackStoredObject(objectKey: string): Promise<void> {
    try {
      await this.photoStorage.delete(objectKey);
    } catch (rollbackError: unknown) {
      this.logger.error(
        `Failed to rollback stored listing photo: ${objectKey}`,
        rollbackError instanceof Error ? rollbackError.stack : undefined,
      );
    }
  }
}
