import { ListingStatus } from '../generated/prisma/enums';
import { UpdateListingDto } from './dto/update-listing.dto';

type ExchangePreferenceSnapshot = {
  desiredCity?: string | null;
  desiredAreas?: string[];
  desiredMinPriceCents?: number | null;
  desiredMaxPriceCents?: number | null;
  desiredPropertyTypes?: string[];
  desiredMoveDate?: Date | null;
};

type ListingEditSnapshot = {
  status: ListingStatus;
  type: string;
  city?: string | null;
  area?: string | null;
  propertyType?: string | null;
  monthlyPriceCents?: number | null;
  depositAmountCents?: number | null;
  billsIncludedType?: string | null;
  extraCostsNote?: string | null;
  genderPreference?: string | null;
  landlordLivesHere?: boolean | null;
  formalContract?: boolean | null;
  landlordApprovalRequired?: boolean | null;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  exchangePreference?: ExchangePreferenceSnapshot | null;
};

function datesDiffer(nextValue: string | undefined, currentValue: Date | null | undefined) {
  if (nextValue === undefined) {
    return false;
  }

  return new Date(nextValue).getTime() !== currentValue?.getTime();
}

function arraysDiffer<T>(nextValue: T[] | undefined, currentValue: T[] | undefined) {
  if (nextValue === undefined) {
    return false;
  }

  if (!currentValue || nextValue.length !== currentValue.length) {
    return true;
  }

  return nextValue.some((value, index) => value !== currentValue[index]);
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
    dto.propertyType !== undefined && dto.propertyType !== currentListing.propertyType,
    dto.monthlyPriceCents !== undefined &&
      dto.monthlyPriceCents !== currentListing.monthlyPriceCents,
    dto.depositAmountCents !== undefined &&
      dto.depositAmountCents !== currentListing.depositAmountCents,
    dto.billsIncludedType !== undefined &&
      dto.billsIncludedType !== currentListing.billsIncludedType,
    dto.extraCostsNote !== undefined &&
      dto.extraCostsNote !== currentListing.extraCostsNote,
    dto.genderPreference !== undefined &&
      dto.genderPreference !== currentListing.genderPreference,
    dto.landlordLivesHere !== undefined &&
      dto.landlordLivesHere !== currentListing.landlordLivesHere,
    dto.formalContract !== undefined &&
      dto.formalContract !== currentListing.formalContract,
    dto.landlordApprovalRequired !== undefined &&
      dto.landlordApprovalRequired !== currentListing.landlordApprovalRequired,
    datesDiffer(dto.availableFrom, currentListing.availableFrom),
    datesDiffer(dto.availableUntil, currentListing.availableUntil),
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
