import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
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
  @MaxLength(500)
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
  @MaxLength(2000)
  houseRules?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  transportInfo?: string;

  // Exchange fields

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  desiredCity?: string;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(120, { each: true })
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
  @ArrayMaxSize(10)
  @IsEnum(PropertyType, { each: true })
  desiredPropertyTypes?: PropertyType[];

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsDateString()
  desiredMoveDate?: string;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  exchangeNotes?: string;
}
