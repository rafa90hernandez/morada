import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  AdvertisedSpaceType,
  BathroomType,
  BedType,
  BillsIncludedType,
  HeatingType,
  HouseholdGenderComposition,
  KitchenAmenity,
  ListingType,
  OutdoorAmenity,
  PropertyOccupancyType,
  PropertyType,
  RoomType,
} from '../../generated/prisma/enums';
import { ListingTransportOptionDto } from './listing-transport-option.dto';

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
  @IsEnum(PropertyOccupancyType)
  propertyOccupancyType?: PropertyOccupancyType;

  @IsOptional()
  @IsEnum(AdvertisedSpaceType)
  advertisedSpaceType?: AdvertisedSpaceType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  bedroomCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  bathroomCount?: number;

  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;

  @IsOptional()
  @IsEnum(BedType)
  bedType?: BedType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxOccupants?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  peopleSharingSpace?: number;

  @IsOptional()
  @IsEnum(BathroomType)
  bathroomType?: BathroomType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  peopleSharingBathroom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  currentResidentCount?: number;

  @IsOptional()
  @IsEnum(HouseholdGenderComposition)
  householdGenderComposition?: HouseholdGenderComposition;

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
  @IsInt()
  @Min(0)
  estimatedMonthlyBillsCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  firstRentAdvanceCents?: number;

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
  @IsBoolean()
  landlordLivesHere?: boolean;

  @IsOptional()
  @IsBoolean()
  childrenFamiliesAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  studentsAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  formalContract?: boolean;

  @IsOptional()
  @IsBoolean()
  landlordApprovalRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  proofOfIncomeRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  proofOfEmploymentRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  priorReferenceRequired?: boolean;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(1000)
  otherRequirementsNote?: string;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  minimumStayDays?: number;

  @IsOptional()
  @IsInt()
  @Min(-10)
  @Max(200)
  floorNumber?: number;

  @IsOptional()
  @IsBoolean()
  isGroundFloor?: boolean;

  @IsOptional()
  @IsBoolean()
  hasLift?: boolean;

  @IsOptional()
  @IsBoolean()
  stepFreeAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  accessibleEntrance?: boolean;

  @IsOptional()
  @IsBoolean()
  adaptedBathroom?: boolean;

  @IsOptional()
  @IsBoolean()
  wheelchairSpace?: boolean;

  @IsOptional()
  @IsBoolean()
  accessibleParking?: boolean;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(500)
  accessibilityOtherNote?: string;

  @IsOptional()
  @IsEnum(HeatingType)
  heatingType?: HeatingType;

  @IsOptional()
  @IsBoolean()
  internetAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  wifiAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  internetIncludedInBills?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  internetSpeedMbps?: number;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(120)
  internetProvider?: string;

  @IsOptional()
  @IsBoolean()
  washingMachine?: boolean;

  @IsOptional()
  @IsBoolean()
  dryer?: boolean;

  @IsOptional()
  @IsBoolean()
  laundrySharedBuilding?: boolean;

  @IsOptional()
  @IsBoolean()
  laundryExtraCost?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsEnum(KitchenAmenity, { each: true })
  kitchenAmenities?: KitchenAmenity[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsEnum(OutdoorAmenity, { each: true })
  outdoorAmenities?: OutdoorAmenity[];

  @IsOptional()
  @IsBoolean()
  carParkingAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  motorbikeParkingAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  bicycleParkingAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  parkingPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  parkingSecure?: boolean;

  @IsOptional()
  @IsBoolean()
  partiesAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  visitorsAllowed?: boolean;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(500)
  quietHoursNote?: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ListingTransportOptionDto)
  transportOptions?: ListingTransportOptionDto[];

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
