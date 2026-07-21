import { ApiProperty } from '@nestjs/swagger';

export class ListingPhotoResponseDto {
  @ApiProperty({
    example: '5a0a4c0d-efb8-41d0-a2fa-6e91d7d16d5a',
  })
  id: string;

  @ApiProperty({
    example: 'https://cdn.morada.app/listings/123/photo.webp',
  })
  url: string;

  @ApiProperty({
    example: 0,
  })
  position: number;

  @ApiProperty({
    example: 1280,
  })
  width: number;

  @ApiProperty({
    example: 853,
  })
  height: number;

  @ApiProperty({
    example: 154382,
  })
  sizeBytes: number;

  @ApiProperty({
    example: 'image/webp',
  })
  mimeType: string;

  @ApiProperty()
  createdAt: Date;
}
