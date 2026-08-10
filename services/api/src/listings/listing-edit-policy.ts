import { ListingStatus } from '../generated/prisma/enums';
import { UpdateListingDto } from './dto/update-listing.dto';

export type ExchangePreferenceSnapshot = {
  desiredCity?: string | null;
  desiredAreas?: string[];
  desiredMinPriceCents?: number | null;
  desiredMaxPriceCents?: number | null;
  desiredPropertyTypes?: string[];
  desiredMoveDate?: Date | null;
};

export type ListingEditSnapshot = {
  status: ListingStatus;
  type: string;
  city?: string | null;
  area?: string | null;
  propertyType?: string | null;
  propertyOccupancyType?: string | null;
  advertisedSpaceType?: string | null;
  bedroomCount?: number | null;
  bathroomCount?: number | null;
  roomType?: string | null;
  bedType?: string | null;
  maxOccupants?: number | null;
  peopleSharingSpace?: number | null;
  bathroomType?: string | null;
  peopleSharingBathroom?: number | null;
  currentResidentCount?: number | null;
  householdGenderComposition?: string | null;
  monthlyPriceCents?: number | null;
  depositAmountCents?: number | null;
  billsIncludedType?: string | null;
  estimatedMonthlyBillsCents?: number | null;
  firstRentAdvanceCents?: number | null;
  extraCostsNote?: string | null;
  landlordLivesHere?: boolean | null;
  formalContract?: boolean | null;
  landlordApprovalRequired?: boolean | null;
  proofOfIncomeRequired?: boolean | null;
  proofOfEmploymentRequired?: boolean | null;
  priorReferenceRequired?: boolean | null;
  childrenFamiliesAllowed?: boolean | null;
  studentsAllowed?: boolean | null;
  couplesAllowed?: boolean | null;
  petsAllowed?: boolean | null;
  smokingAllowed?: boolean | null;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  minimumStayDays?: number | null;
  exchangePreference?: ExchangePreferenceSnapshot | null;
};

function datesDiffer(
  nextValue: string | undefined,
  currentValue: Date | null | undefined,
) {
  if (nextValue === undefined) {
    return false;
  }

  return new Date(nextValue).getTime() !== currentValue?.getTime();
}

function arraysDiffer<T extends string>(
  nextValue: T[] | undefined,
  currentValue: T[] | undefined,
) {
  if (nextValue === undefined) {
    return false;
  }

  if (!currentValue || nextValue.length !== currentValue.length) {
    return true;
  }

  const nextSorted = [...nextValue].sort();
  const currentSorted = [...currentValue].sort();

  return nextSorted.some((value, index) => value !== currentSorted[index]);
}

export function hasCriticalListingChanges(
  currentListing: ListingEditSnapshot,
  dto: UpdateListingDto,
): boolean {
  const exchangePreference = currentListing.exchangePreference;

  return [
    dto.type !== undefined && dto.type !== currentListing.type,
    dto.city !== undefined && dto.city !== currentListing.city,
    dto.area !== undefined && dto.area !== currentListing.area,
    dto.propertyType !== undefined &&
      dto.propertyType !== currentListing.propertyType,
    dto.propertyOccupancyType !== undefined &&
      dto.propertyOccupancyType !== currentListing.propertyOccupancyType,
    dto.advertisedSpaceType !== undefined &&
      dto.advertisedSpaceType !== currentListing.advertisedSpaceType,
    dto.bedroomCount !== undefined &&
      dto.bedroomCount !== currentListing.bedroomCount,
    dto.bathroomCount !== undefined &&
      dto.bathroomCount !== currentListing.bathroomCount,
    dto.roomType !== undefined && dto.roomType !== currentListing.roomType,
    dto.bedType !== undefined && dto.bedType !== currentListing.bedType,
    dto.maxOccupants !== undefined &&
      dto.maxOccupants !== currentListing.maxOccupants,
    dto.peopleSharingSpace !== undefined &&
      dto.peopleSharingSpace !== currentListing.peopleSharingSpace,
    dto.bathroomType !== undefined &&
      dto.bathroomType !== currentListing.bathroomType,
    dto.peopleSharingBathroom !== undefined &&
      dto.peopleSharingBathroom !== currentListing.peopleSharingBathroom,
    dto.currentResidentCount !== undefined &&
      dto.currentResidentCount !== currentListing.currentResidentCount,
    dto.householdGenderComposition !== undefined &&
      dto.householdGenderComposition !==
        currentListing.householdGenderComposition,
    dto.monthlyPriceCents !== undefined &&
      dto.monthlyPriceCents !== currentListing.monthlyPriceCents,
    dto.depositAmountCents !== undefined &&
      dto.depositAmountCents !== currentListing.depositAmountCents,
    dto.billsIncludedType !== undefined &&
      dto.billsIncludedType !== currentListing.billsIncludedType,
    dto.estimatedMonthlyBillsCents !== undefined &&
      dto.estimatedMonthlyBillsCents !==
        currentListing.estimatedMonthlyBillsCents,
    dto.firstRentAdvanceCents !== undefined &&
      dto.firstRentAdvanceCents !== currentListing.firstRentAdvanceCents,
    dto.extraCostsNote !== undefined &&
      dto.extraCostsNote !== currentListing.extraCostsNote,
    dto.landlordLivesHere !== undefined &&
      dto.landlordLivesHere !== currentListing.landlordLivesHere,
    dto.formalContract !== undefined &&
      dto.formalContract !== currentListing.formalContract,
    dto.landlordApprovalRequired !== undefined &&
      dto.landlordApprovalRequired !== currentListing.landlordApprovalRequired,
    dto.proofOfIncomeRequired !== undefined &&
      dto.proofOfIncomeRequired !== currentListing.proofOfIncomeRequired,
    dto.proofOfEmploymentRequired !== undefined &&
      dto.proofOfEmploymentRequired !==
        currentListing.proofOfEmploymentRequired,
    dto.priorReferenceRequired !== undefined &&
      dto.priorReferenceRequired !== currentListing.priorReferenceRequired,
    dto.childrenFamiliesAllowed !== undefined &&
      dto.childrenFamiliesAllowed !== currentListing.childrenFamiliesAllowed,
    dto.studentsAllowed !== undefined &&
      dto.studentsAllowed !== currentListing.studentsAllowed,
    dto.couplesAllowed !== undefined &&
      dto.couplesAllowed !== currentListing.couplesAllowed,
    dto.petsAllowed !== undefined &&
      dto.petsAllowed !== currentListing.petsAllowed,
    dto.smokingAllowed !== undefined &&
      dto.smokingAllowed !== currentListing.smokingAllowed,
    datesDiffer(dto.availableFrom, currentListing.availableFrom),
    datesDiffer(dto.availableUntil, currentListing.availableUntil),
    dto.minimumStayDays !== undefined &&
      dto.minimumStayDays !== currentListing.minimumStayDays,
    dto.desiredCity !== undefined &&
      dto.desiredCity !== exchangePreference?.desiredCity,
    arraysDiffer(dto.desiredAreas, exchangePreference?.desiredAreas),
    dto.desiredMinPriceCents !== undefined &&
      dto.desiredMinPriceCents !== exchangePreference?.desiredMinPriceCents,
    dto.desiredMaxPriceCents !== undefined &&
      dto.desiredMaxPriceCents !== exchangePreference?.desiredMaxPriceCents,
    arraysDiffer(
      dto.desiredPropertyTypes,
      exchangePreference?.desiredPropertyTypes,
    ),
    datesDiffer(dto.desiredMoveDate, exchangePreference?.desiredMoveDate),
  ].some(Boolean);
}

export function shouldReturnListingToReview(
  currentListing: ListingEditSnapshot,
  dto: UpdateListingDto,
): boolean {
  const isPreviouslyApproved =
    currentListing.status === ListingStatus.ACTIVE ||
    currentListing.status === ListingStatus.PAUSED;

  return isPreviouslyApproved && hasCriticalListingChanges(currentListing, dto);
}
