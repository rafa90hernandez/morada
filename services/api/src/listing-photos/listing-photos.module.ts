import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';

import { ListingPhotosController } from './listing-photos.controller';
import { ListingPhotoImageProcessor } from './listing-photo-image.processor';
import { ListingPhotoMapper } from './listing-photo.mapper';
import { ListingPhotosRepository } from './listing-photos.repository';
import { ListingPhotoStorageService } from './listing-photo-storage.service';
import { ListingPhotosService } from './listing-photos.service';

@Module({
  imports: [ListingsModule],
  controllers: [ListingPhotosController],
  providers: [
    ListingPhotosRepository,
    ListingPhotosService,
    ListingPhotoImageProcessor,
    ListingPhotoStorageService,
    ListingPhotoMapper,
  ],
  exports: [ListingPhotosService],
})
export class ListingPhotosModule {}
