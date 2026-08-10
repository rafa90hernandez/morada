import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import sharp from 'sharp';

export type ListingAuthorizationEvidenceInput = {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
};

export type ProcessedListingAuthorizationEvidence = {
  buffer: Buffer;
  mimeType: 'application/pdf' | 'image/jpeg';
  sizeBytes: number;
  extension: 'pdf' | 'jpg';
};

@Injectable()
export class ListingAuthorizationEvidenceProcessor {
  static readonly MAX_INPUT_SIZE_BYTES = 10 * 1024 * 1024;

  private static readonly MAX_DIMENSION = 4096;
  private static readonly JPEG_QUALITY = 90;
  private static readonly IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  async process(
    input: ListingAuthorizationEvidenceInput,
  ): Promise<ProcessedListingAuthorizationEvidence> {
    this.validateCommonInput(input);

    if (input.mimeType === 'application/pdf') {
      return this.processPdf(input);
    }

    if (
      ListingAuthorizationEvidenceProcessor.IMAGE_MIME_TYPES.has(input.mimeType)
    ) {
      return this.processImage(input);
    }

    throw new BadRequestException(
      'Authorization evidence must be PDF, JPEG, PNG or WebP.',
    );
  }

  private validateCommonInput(input: ListingAuthorizationEvidenceInput): void {
    if (input.sizeBytes <= 0 || input.buffer.length === 0) {
      throw new BadRequestException('Authorization evidence cannot be empty.');
    }

    if (
      input.sizeBytes >
      ListingAuthorizationEvidenceProcessor.MAX_INPUT_SIZE_BYTES
    ) {
      throw new PayloadTooLargeException(
        'Each authorization evidence file must not exceed 10 MB.',
      );
    }

    if (input.buffer.length !== input.sizeBytes) {
      throw new BadRequestException(
        'Authorization evidence file size is inconsistent.',
      );
    }
  }

  private processPdf(
    input: ListingAuthorizationEvidenceInput,
  ): ProcessedListingAuthorizationEvidence {
    const header = input.buffer.subarray(0, 5).toString('ascii');
    const tail = input.buffer
      .subarray(Math.max(0, input.buffer.length - 2048))
      .toString('latin1');

    if (header !== '%PDF-' || !tail.includes('%%EOF')) {
      throw new BadRequestException(
        'Authorization evidence does not contain a valid PDF signature.',
      );
    }

    return {
      buffer: input.buffer,
      mimeType: 'application/pdf',
      sizeBytes: input.buffer.byteLength,
      extension: 'pdf',
    };
  }

  private async processImage(
    input: ListingAuthorizationEvidenceInput,
  ): Promise<ProcessedListingAuthorizationEvidence> {
    try {
      const image = sharp(input.buffer, {
        failOn: 'error',
        limitInputPixels: 50_000_000,
      });
      const metadata = await image.metadata();

      if (
        !metadata.format ||
        !['jpeg', 'png', 'webp'].includes(metadata.format)
      ) {
        throw new BadRequestException(
          'Authorization evidence must contain a valid JPEG, PNG or WebP image.',
        );
      }

      const data = await image
        .rotate()
        .resize({
          width: ListingAuthorizationEvidenceProcessor.MAX_DIMENSION,
          height: ListingAuthorizationEvidenceProcessor.MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: ListingAuthorizationEvidenceProcessor.JPEG_QUALITY,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        buffer: data,
        mimeType: 'image/jpeg',
        sizeBytes: data.byteLength,
        extension: 'jpg',
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof PayloadTooLargeException
      ) {
        throw error;
      }

      throw new UnprocessableEntityException(
        'The uploaded authorization evidence is not a valid supported image.',
      );
    }
  }
}
