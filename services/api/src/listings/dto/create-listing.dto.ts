import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  BillsIncludedType,
  GenderPreference,
  ListingType,
  PropertyType,
} from '../../generated/prisma/enums';

export class CreateListingDto {
  @IsEnum(ListingType)
  type!: ListingType;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmountCents?: number;

  @IsOptional()
  @IsEnum(BillsIncludedType)
  billsIncludedType?: BillsIncludedType;

  @IsOptional()
  @IsString()
  extraCostsNote?: string;

  @IsOptional()
  @IsBoolean()
  furnished?: boolean;

  @IsOptional()
  @IsBoolean()
  couplesAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @IsOptional()
  @IsEnum(GenderPreference)
  genderPreference?: GenderPreference;

  @IsOptional()
  @IsBoolean()
  landlordLivesHere?: boolean;

  @IsOptional()
  @IsBoolean()
  formalContract?: boolean;

  @IsOptional()
  @IsBoolean()
  landlordApprovalRequired?: boolean;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @IsOptional()
  @IsString()
  houseRules?: string;

  @IsOptional()
  @IsString()
  transportInfo?: string;

  // Exchange fields

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsString()
  desiredCity?: string;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  desiredAreas?: string[];

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsInt()
  @Min(0)
  desiredMinPriceCents?: number;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsInt()
  @Min(0)
  desiredMaxPriceCents?: number;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  desiredPropertyTypes?: PropertyType[];

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsDateString()
  desiredMoveDate?: string;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsString()
  exchangeNotes?: string;
}
