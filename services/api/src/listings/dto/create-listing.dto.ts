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
  Matches,
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

const CONTAINS_NON_WHITESPACE = /\S/;
const NON_BLANK_MESSAGE = 'must contain at least one non-whitespace character';

export class CreateListingDto {
  @IsEnum(ListingType)
  type!: ListingType;

  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, { message: `title ${NON_BLANK_MESSAGE}` })
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `description ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, { message: `city ${NON_BLANK_MESSAGE}` })
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, { message: `area ${NON_BLANK_MESSAGE}` })
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
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `extraCostsNote ${NON_BLANK_MESSAGE}`,
  })
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
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `houseRules ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(2000)
  houseRules?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `transportInfo ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(1000)
  transportInfo?: string;

  // Exchange fields

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `desiredCity ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(100)
  desiredCity?: string;

  @ValidateIf((dto: CreateListingDto) => dto.type === ListingType.EXCHANGE)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(CONTAINS_NON_WHITESPACE, {
    each: true,
    message: `each desired area ${NON_BLANK_MESSAGE}`,
  })
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
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `exchangeNotes ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(2000)
  exchangeNotes?: string;
}
