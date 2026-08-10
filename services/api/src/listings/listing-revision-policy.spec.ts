import {
  KitchenAmenity,
  ListingStatus,
  ListingType,
  PropertyType,
} from '../generated/prisma/enums';
import {
  buildListingRevisionValues,
  classifyListingRevision,
  getChangedListingFields,
  type ListingRevisionSnapshot,
} from './listing-revision-policy';

const current: ListingRevisionSnapshot = {
  status: ListingStatus.ACTIVE,
  type: ListingType.RENTAL,
  title: 'Room in Dublin 8',
  description: 'Bright room.',
  city: 'Dublin',
  area: 'Dublin 8',
  propertyType: PropertyType.SINGLE_ROOM,
  monthlyPriceCents: 90000,
  furnished: true,
  kitchenAmenities: [KitchenAmenity.OVEN, KitchenAmenity.KETTLE],
  availableFrom: new Date('2026-09-01T00:00:00.000Z'),
  exchangePreference: null,
  transportOptions: [],
};

describe('listing revision policy', () => {
  it('classifies a real price edit as critical', () => {
    const dto = { monthlyPriceCents: 95000 };
    const fields = getChangedListingFields(current, dto);

    expect(fields).toEqual(['monthlyPriceCents']);
    expect(classifyListingRevision(current, dto, fields)).toBe('CRITICAL');
  });

  it('classifies copy and amenity edits as minor', () => {
    const dto = {
      description: 'Updated description.',
      kitchenAmenities: [KitchenAmenity.KETTLE],
    };
    const fields = getChangedListingFields(current, dto);

    expect(fields).toEqual(['description', 'kitchenAmenities']);
    expect(classifyListingRevision(current, dto, fields)).toBe('MINOR');
  });

  it('does not create a revision for unchanged values or array reordering', () => {
    const dto = {
      monthlyPriceCents: 90000,
      availableFrom: '2026-09-01T00:00:00.000Z',
      kitchenAmenities: [KitchenAmenity.KETTLE, KitchenAmenity.OVEN],
    };

    expect(getChangedListingFields(current, dto)).toEqual([]);
    expect(classifyListingRevision(current, dto)).toBeNull();
  });

  it('omits free-text values while retaining structured before and after data', () => {
    const dto = {
      description: 'Contains user-entered free text.',
      monthlyPriceCents: 95000,
    };
    const fields = getChangedListingFields(current, dto);
    const values = buildListingRevisionValues(current, dto, fields);

    expect(fields).toEqual(['description', 'monthlyPriceCents']);
    expect(values.before).toEqual({ monthlyPriceCents: 90000 });
    expect(values.after).toEqual({ monthlyPriceCents: 95000 });
  });
});
