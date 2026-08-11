import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';

import { MessageAttachmentType } from '../generated/prisma/enums';
import { MessageAttachmentProcessor } from './message-attachment.processor';

describe('MessageAttachmentProcessor', () => {
  const processor = new MessageAttachmentProcessor();

  it('accepts a structurally signed PDF without rewriting its bytes', async () => {
    const buffer = Buffer.from('%PDF-1.7\nexample\n%%EOF');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      }),
    ).resolves.toEqual({
      buffer,
      type: MessageAttachmentType.PDF,
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      extension: 'pdf',
    });
  });

  it('rejects a spoofed PDF declaration', async () => {
    const buffer = Buffer.from('not-a-pdf');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('re-encodes a valid image as metadata-free JPEG output', async () => {
    const source = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#245c45',
      },
    })
      .png()
      .toBuffer();

    const result = await processor.process({
      buffer: source,
      mimeType: 'image/png',
      sizeBytes: source.length,
    });
    const metadata = await sharp(result.buffer).metadata();

    expect(result.type).toBe(MessageAttachmentType.IMAGE);
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
    expect(metadata.format).toBe('jpeg');
    expect(metadata.exif).toBeUndefined();
  });

  it('rejects invalid bytes declared as an image', async () => {
    const buffer = Buffer.from('not-an-image');

    await expect(
      processor.process({
        buffer,
        mimeType: 'image/jpeg',
        sizeBytes: buffer.length,
      }),
    ).rejects.toThrow();
  });

  it('rejects unsupported declared MIME types', async () => {
    const buffer = Buffer.from('document');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/msword',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects files above the 10 MB private attachment limit', async () => {
    const buffer = Buffer.alloc(
      MessageAttachmentProcessor.MAX_INPUT_SIZE_BYTES + 1,
      1,
    );

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
