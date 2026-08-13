import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  AdvertisedSpaceType,
  BathroomType,
  BillsIncludedType,
  ListingType,
  PropertyOccupancyType,
  PropertyType,
} from '../../generated/prisma/enums';

export enum PublicListingSort {
  RELEVANCE = 'RELEVANCE',
  PRICE_ASC = 'PRICE_ASC',
  PRICE_DESC = 'PRICE_DESC',
  NEWEST = 'NEWEST',
}

function trimOptionalString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function parseBoolean(value: unknown): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class PublicListingSearchQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  county?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  area?: string;

  @IsOptional()
  @IsIn([ListingType.RENTAL, ListingType.TRANSFER])
  listingType?: ListingType;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(PropertyOccupancyType)
  propertyOccupancyType?: PropertyOccupancyType;

  @IsOptional()
  @IsEnum(AdvertisedSpaceType)
  advertisedSpaceType?: AdvertisedSpaceType;

  @IsOptional()
  @IsEnum(BathroomType)
  bathroomType?: BathroomType;

  @IsOptional()
  @IsEnum(BillsIncludedType)
  billsIncludedType?: BillsIncludedType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  @IsOptional()
  @IsDateString()
  availableOn?: string;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  couplesAllowed?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  petsAllowed?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  smokingAllowed?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  childrenFamiliesAllowed?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  studentsAllowed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedroomCountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathroomCountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentResidentCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  peopleSharingSpace?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  peopleSharingBathroom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxMinimumStayDays?: number;

  @IsOptional()
  @IsEnum(PublicListingSort)
  sort: PublicListingSort = PublicListingSort.RELEVANCE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
