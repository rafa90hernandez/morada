import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { TransportMode } from '../../generated/prisma/enums';

const CONTAINS_NON_WHITESPACE = /\S/;

export class ListingTransportOptionDto {
  @IsEnum(TransportMode)
  mode!: TransportMode;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(120)
  stopName?: string;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(100)
  lineName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  walkingMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  distanceMeters?: number;
}
