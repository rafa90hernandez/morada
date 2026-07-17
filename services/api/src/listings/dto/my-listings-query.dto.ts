import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { ListingStatus, ListingType } from '../../generated/prisma/enums';

export class MyListingsQueryDto {
  @ApiPropertyOptional({
    enum: ListingStatus,
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({
    enum: ListingType,
  })
  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;
}
