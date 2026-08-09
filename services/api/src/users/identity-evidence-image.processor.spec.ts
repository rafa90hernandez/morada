import {
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';

import { IdentityEvidenceImageProcessor } from './identity-evidence-image.processor';

describe('IdentityEvidenceImageProcessor', () => {
  const processor = new IdentityEvidenceImageProcessor();

  it('rejects empty evidence', async () => {
    await expect(
      processor.process({
        buffer: Buffer.alloc(0),
        mimeType: 'image/jpeg',
        sizeBytes: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported declared MIME types before decoding', async () => {
    const buffer = Buffer.from('not-an-image');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inconsistent declared byte size', async () => {
    const buffer = Buffer.from('not-an-image');

    await expect(
      processor.process({
        buffer,
        mimeType: 'image/jpeg',
        sizeBytes: buffer.length + 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects evidence larger than the 10 MB server limit', async () => {
    const buffer = Buffer.alloc(
      IdentityEvidenceImageProcessor.MAX_INPUT_SIZE_BYTES + 1,
    );

    await expect(
      processor.process({
        buffer,
        mimeType: 'image/jpeg',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
