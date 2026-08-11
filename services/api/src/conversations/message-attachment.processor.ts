import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import sharp from 'sharp';

import { MessageAttachmentType } from '../generated/prisma/enums';

export type MessageAttachmentInput = {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
};

export type ProcessedMessageAttachment = {
  buffer: Buffer;
  type: MessageAttachmentType;
  mimeType: 'application/pdf' | 'image/jpeg';
  sizeBytes: number;
  extension: 'pdf' | 'jpg';
};

@Injectable()
export class MessageAttachmentProcessor {
  static readonly MAX_INPUT_SIZE_BYTES = 10 * 1024 * 1024;

  private static readonly MAX_DIMENSION = 4096;
  private static readonly JPEG_QUALITY = 90;
  private static readonly IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  async process(
    input: MessageAttachmentInput,
  ): Promise<ProcessedMessageAttachment> {
    this.validateCommonInput(input);

    if (input.mimeType === 'application/pdf') {
      return this.processPdf(input);
    }

    if (MessageAttachmentProcessor.IMAGE_MIME_TYPES.has(input.mimeType)) {
      return this.processImage(input);
    }

    throw new BadRequestException(
      'Message attachment must be PDF, JPEG, PNG or WebP.',
    );
  }

  private validateCommonInput(input: MessageAttachmentInput): void {
    if (input.sizeBytes <= 0 || input.buffer.length === 0) {
      throw new BadRequestException('Message attachment cannot be empty.');
    }

    if (input.sizeBytes > MessageAttachmentProcessor.MAX_INPUT_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        'Each message attachment must not exceed 10 MB.',
      );
    }

    if (input.buffer.length !== input.sizeBytes) {
      throw new BadRequestException('Message attachment size is inconsistent.');
    }
  }

  private processPdf(input: MessageAttachmentInput): ProcessedMessageAttachment {
    const header = input.buffer.subarray(0, 5).toString('ascii');
    const tail = input.buffer
      .subarray(Math.max(0, input.buffer.length - 2048))
      .toString('latin1');

    if (header !== '%PDF-' || !tail.includes('%%EOF')) {
      throw new BadRequestException(
        'Message attachment does not contain a valid PDF signature.',
      );
    }

    return {
      buffer: input.buffer,
      type: MessageAttachmentType.PDF,
      mimeType: 'application/pdf',
      sizeBytes: input.buffer.byteLength,
      extension: 'pdf',
    };
  }

  private async processImage(
    input: MessageAttachmentInput,
  ): Promise<ProcessedMessageAttachment> {
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
          'Message attachment must contain a valid JPEG, PNG or WebP image.',
        );
      }

      const data = await image
        .rotate()
        .resize({
          width: MessageAttachmentProcessor.MAX_DIMENSION,
          height: MessageAttachmentProcessor.MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: MessageAttachmentProcessor.JPEG_QUALITY,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        buffer: data,
        type: MessageAttachmentType.IMAGE,
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
        'The uploaded message attachment is not a valid supported image.',
      );
    }
  }
}
