import {
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';

import { ListingAuthorizationEvidenceProcessor } from './listing-authorization-evidence.processor';

describe('ListingAuthorizationEvidenceProcessor', () => {
  const processor = new ListingAuthorizationEvidenceProcessor();

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
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      extension: 'pdf',
    });
  });

  it('rejects a file declared as PDF without a PDF signature', async () => {
    const buffer = Buffer.from('not-a-pdf');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported document types', async () => {
    const buffer = Buffer.from('document');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/msword',
        sizeBytes: buffer.length,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inconsistent size metadata', async () => {
    const buffer = Buffer.from('%PDF-1.7\n%%EOF');

    await expect(
      processor.process({
        buffer,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length + 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects files above the private evidence limit', async () => {
    const buffer = Buffer.alloc(
      ListingAuthorizationEvidenceProcessor.MAX_INPUT_SIZE_BYTES + 1,
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
