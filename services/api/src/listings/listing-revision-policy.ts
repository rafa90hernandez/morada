import type { Prisma } from '../generated/prisma/client';
import { UpdateListingDto } from './dto/update-listing.dto';
import {
  hasCriticalListingChanges,
  type ListingEditSnapshot,
} from './listing-edit-policy';

export type ListingRevisionClassificationValue = 'CRITICAL' | 'MINOR';

export type ListingRevisionSnapshot = ListingEditSnapshot & {
  title?: string | null;
  description?: string | null;
  furnished?: boolean | null;
  floorNumber?: number | null;
  isGroundFloor?: boolean | null;
  hasLift?: boolean | null;
  stepFreeAccess?: boolean | null;
  accessibleEntrance?: boolean | null;
  adaptedBathroom?: boolean | null;
  wheelchairSpace?: boolean | null;
  accessibleParking?: boolean | null;
  accessibilityOtherNote?: string | null;
  heatingType?: string | null;
  internetAvailable?: boolean | null;
  wifiAvailable?: boolean | null;
  internetIncludedInBills?: boolean | null;
  internetSpeedMbps?: number | null;
  internetProvider?: string | null;
  washingMachine?: boolean | null;
  dryer?: boolean | null;
  laundrySharedBuilding?: boolean | null;
  laundryExtraCost?: boolean | null;
  kitchenAmenities?: string[];
  outdoorAmenities?: string[];
  carParkingAvailable?: boolean | null;
  motorbikeParkingAvailable?: boolean | null;
  bicycleParkingAvailable?: boolean | null;
  parkingPaid?: boolean | null;
  parkingSecure?: boolean | null;
  partiesAllowed?: boolean | null;
  visitorsAllowed?: boolean | null;
  quietHoursNote?: string | null;
  houseRules?: string | null;
  transportInfo?: string | null;
  transportOptions?: Array<{
    mode: string;
    stopName?: string | null;
    lineName?: string | null;
    walkingMinutes?: number | null;
    distanceMeters?: number | null;
  }>;
  exchangePreference?:
    | (NonNullable<ListingEditSnapshot['exchangePreference']> & {
        notes?: string | null;
      })
    | null;
};

const VALUE_OMITTED_FIELDS = new Set([
  'title',
  'description',
  'extraCostsNote',
  'otherRequirementsNote',
  'accessibilityOtherNote',
  'internetProvider',
  'quietHoursNote',
  'houseRules',
  'transportInfo',
  'exchangeNotes',
]);

const EXCHANGE_FIELD_MAP: Record<string, string> = {
  desiredCity: 'desiredCity',
  desiredAreas: 'desiredAreas',
  desiredMinPriceCents: 'desiredMinPriceCents',
  desiredMaxPriceCents: 'desiredMaxPriceCents',
  desiredPropertyTypes: 'desiredPropertyTypes',
  desiredMoveDate: 'desiredMoveDate',
  exchangeNotes: 'notes',
};

const DATE_FIELDS = new Set([
  'availableFrom',
  'availableUntil',
  'desiredMoveDate',
]);

function normalizeTransportOptions(value: unknown): Prisma.InputJsonArray {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value.map((item) => {
    const option = item as {
      mode?: unknown;
      stopName?: unknown;
      lineName?: unknown;
      walkingMinutes?: unknown;
      distanceMeters?: unknown;
    };

    return {
      mode: String(option.mode ?? ''),
      stopName: option.stopName == null ? null : String(option.stopName),
      lineName: option.lineName == null ? null : String(option.lineName),
      walkingMinutes:
        option.walkingMinutes == null ? null : Number(option.walkingMinutes),
      distanceMeters:
        option.distanceMeters == null ? null : Number(option.distanceMeters),
    } satisfies Prisma.InputJsonObject;
  });

  return normalized.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function normalizeValue(field: string, value: unknown): Prisma.InputJsonValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (field === 'transportOptions') {
    return normalizeTransportOptions(value);
  }

  if (DATE_FIELDS.has(field)) {
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry))
      .sort((left, right) => left.localeCompare(right));
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value;
  }

  return String(value);
}

function getCurrentValue(
  current: ListingRevisionSnapshot,
  field: string,
): unknown {
  if (field in EXCHANGE_FIELD_MAP) {
    return current.exchangePreference?.[EXCHANGE_FIELD_MAP[field] as keyof NonNullable<
      ListingRevisionSnapshot['exchangePreference']
    >];
  }

  if (field === 'transportOptions') {
    return current.transportOptions;
  }

  return (current as unknown as Record<string, unknown>)[field];
}

function valuesEqual(field: string, left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeValue(field, left)) ===
    JSON.stringify(normalizeValue(field, right))
  );
}

export function getChangedListingFields(
  current: ListingRevisionSnapshot,
  dto: UpdateListingDto,
): string[] {
  const next = dto as unknown as Record<string, unknown>;

  return Object.keys(next)
    .filter((field) => next[field] !== undefined)
    .filter((field) => !valuesEqual(field, getCurrentValue(current, field), next[field]))
    .sort();
}

export function classifyListingRevision(
  current: ListingRevisionSnapshot,
  dto: UpdateListingDto,
  changedFields = getChangedListingFields(current, dto),
): ListingRevisionClassificationValue | null {
  if (changedFields.length === 0) {
    return null;
  }

  return hasCriticalListingChanges(current, dto) ? 'CRITICAL' : 'MINOR';
}

export function buildListingRevisionValues(
  current: ListingRevisionSnapshot,
  dto: UpdateListingDto,
  changedFields: string[],
): {
  before: Prisma.InputJsonObject;
  after: Prisma.InputJsonObject;
} {
  const next = dto as unknown as Record<string, unknown>;
  const before: Prisma.InputJsonObject = {};
  const after: Prisma.InputJsonObject = {};

  for (const field of changedFields) {
    if (VALUE_OMITTED_FIELDS.has(field)) {
      continue;
    }

    before[field] = normalizeValue(field, getCurrentValue(current, field));
    after[field] = normalizeValue(field, next[field]);
  }

  return { before, after };
}
