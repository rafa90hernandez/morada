import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { ListingCloseReason } from '../../generated/prisma/enums';

export class CloseListingDto {
  @ApiProperty({ enum: ListingCloseReason })
  @IsEnum(ListingCloseReason)
  reason!: ListingCloseReason;

  @ApiPropertyOptional({
    description: 'Optional context for the structured close reason.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  detail?: string;
}
