import { Injectable } from '@nestjs/common';

import { ListingPhotoResponseDto } from './dto/listing-photo-response.dto';

interface ListingPhotoResponseSource {
  id: string;
  url: string;
  position: number;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

@Injectable()
export class ListingPhotoMapper {
  toResponse(photo: ListingPhotoResponseSource): ListingPhotoResponseDto {
    return {
      id: photo.id,
      url: photo.url,
      position: photo.position,
      width: photo.width,
      height: photo.height,
      sizeBytes: photo.sizeBytes,
      mimeType: photo.mimeType,
      createdAt: photo.createdAt,
    };
  }

  toResponseList(
    photos: ListingPhotoResponseSource[],
  ): ListingPhotoResponseDto[] {
    return photos.map((photo) => this.toResponse(photo));
  }
}
