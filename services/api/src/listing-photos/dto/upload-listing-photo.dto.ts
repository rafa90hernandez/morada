import { ApiProperty } from '@nestjs/swagger';

export class UploadListingPhotoDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'JPEG, PNG or WebP image with a maximum size of 10 MB',
  })
  file: unknown;
}
