import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import sharp from 'sharp';

export type IdentityEvidenceImageInput = {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
};

export type ProcessedIdentityEvidenceImage = {
  buffer: Buffer;
  mimeType: 'image/jpeg';
  sizeBytes: number;
};

@Injectable()
export class IdentityEvidenceImageProcessor {
  static readonly MAX_INPUT_SIZE_BYTES = 10 * 1024 * 1024;

  private static readonly MAX_DIMENSION = 4096;
  private static readonly JPEG_QUALITY = 90;

  private static readonly ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  async process(
    input: IdentityEvidenceImageInput,
  ): Promise<ProcessedIdentityEvidenceImage> {
    this.validateInput(input);

    try {
      const image = sharp(input.buffer, {
        failOn: 'error',
        limitInputPixels: 50_000_000,
      });

      const metadata = await image.metadata();

      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
        throw new BadRequestException(
          'Identity evidence must contain a valid JPEG, PNG or WebP image.',
        );
      }

      const data = await image
        .rotate()
        .resize({
          width: IdentityEvidenceImageProcessor.MAX_DIMENSION,
          height: IdentityEvidenceImageProcessor.MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: IdentityEvidenceImageProcessor.JPEG_QUALITY,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        buffer: data,
        mimeType: 'image/jpeg',
        sizeBytes: data.byteLength,
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof PayloadTooLargeException
      ) {
        throw error;
      }

      throw new UnprocessableEntityException(
        'The uploaded identity evidence is not a valid supported image.',
      );
    }
  }

  private validateInput(input: IdentityEvidenceImageInput): void {
    if (input.sizeBytes <= 0 || input.buffer.length === 0) {
      throw new BadRequestException('Identity evidence cannot be empty.');
    }

    if (
      input.sizeBytes > IdentityEvidenceImageProcessor.MAX_INPUT_SIZE_BYTES
    ) {
      throw new PayloadTooLargeException(
        'Each identity evidence image must not exceed 10 MB.',
      );
    }

    if (input.buffer.length !== input.sizeBytes) {
      throw new BadRequestException(
        'Identity evidence image size is inconsistent.',
      );
    }

    if (!IdentityEvidenceImageProcessor.ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new BadRequestException(
        'Identity evidence must be JPEG, PNG or WebP.',
      );
    }
  }
}
