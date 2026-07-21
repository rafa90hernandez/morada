import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingPhotoResponseDto } from './dto/listing-photo-response.dto';
import { UploadListingPhotoDto } from './dto/upload-listing-photo.dto';
import { ListingPhotoMapper } from './listing-photo.mapper';
import { ListingPhotosService } from './listing-photos.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UploadListingPhotoCommand } from './types/listing-photo.types';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

@ApiTags('Listing photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('listings/:listingId/photos')
export class ListingPhotosController {
  constructor(
    private readonly listingPhotosService: ListingPhotosService,
    private readonly listingPhotoMapper: ListingPhotoMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_IMAGE_SIZE_BYTES,
        files: 1,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a photo to a listing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadListingPhotoDto,
  })
  @ApiCreatedResponse({
    description: 'Listing photo uploaded successfully',
    type: ListingPhotoResponseDto,
  })
  async upload(
    @Param('listingId') listingId: string,
    @CurrentUser('id') authenticatedUserId: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<ListingPhotoResponseDto> {
    const command: UploadListingPhotoCommand = {
      listingId,
      authenticatedUserId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      buffer: file.buffer,
    };

    const photo = await this.listingPhotosService.upload(command);

    return this.listingPhotoMapper.toResponse(photo);
  }
}
