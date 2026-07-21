import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import sharp from 'sharp';

import type {
  ProcessedListingImage,
  UploadListingPhotoCommand,
} from './types/listing-photo.types';

@Injectable()
export class ListingPhotoImageProcessor {
  private static readonly MAX_INPUT_SIZE_BYTES = 10 * 1024 * 1024;

  private static readonly MAX_DIMENSION = 1920;
  private static readonly WEBP_QUALITY = 82;

  private static readonly ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  async process(
    input: UploadListingPhotoCommand,
  ): Promise<ProcessedListingImage> {
    this.validateInputSize(input);
    this.validateDeclaredMimeType(input.mimeType);

    try {
      const image = sharp(input.buffer, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
      });

      const metadata = await image.metadata();

      this.validateDecodedFormat(metadata.format);

      const { data, info } = await image
        .rotate()
        .resize({
          width: ListingPhotoImageProcessor.MAX_DIMENSION,
          height: ListingPhotoImageProcessor.MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: ListingPhotoImageProcessor.WEBP_QUALITY,
        })
        .toBuffer({
          resolveWithObject: true,
        });

      if (!info.width || !info.height) {
        throw new UnprocessableEntityException(
          'Could not determine the processed image dimensions',
        );
      }

      return {
        buffer: data,
        width: info.width,
        height: info.height,
        sizeBytes: data.byteLength,
        mimeType: 'image/webp',
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof PayloadTooLargeException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }

      throw new UnprocessableEntityException(
        'The uploaded file is not a valid or supported image',
      );
    }
  }

  private validateInputSize(input: UploadListingPhotoCommand): void {
    if (input.sizeBytes <= 0 || input.buffer.length === 0) {
      throw new BadRequestException('The uploaded image is empty');
    }

    if (input.sizeBytes > ListingPhotoImageProcessor.MAX_INPUT_SIZE_BYTES) {
      throw new PayloadTooLargeException('The image must not exceed 10 MB');
    }

    if (input.buffer.length !== input.sizeBytes) {
      throw new BadRequestException('The uploaded image size is inconsistent');
    }
  }

  private validateDeclaredMimeType(mimeType: string): void {
    if (!ListingPhotoImageProcessor.ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        'Only JPEG, PNG and WebP images are allowed',
      );
    }
  }

  private validateDecodedFormat(format?: string): void {
    if (!format || !['jpeg', 'png', 'webp'].includes(format)) {
      throw new BadRequestException(
        'The file content must be a valid JPEG, PNG or WebP image',
      );
    }
  }
}
