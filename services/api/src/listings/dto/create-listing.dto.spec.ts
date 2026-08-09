import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  AdvertisedSpaceType,
  BathroomType,
  KitchenAmenity,
  ListingType,
  PropertyOccupancyType,
  PropertyType,
  TransportMode,
} from '../../generated/prisma/enums';
import { CreateListingDto } from './create-listing.dto';

function validRental(overrides: Partial<CreateListingDto> = {}) {
  return plainToInstance(CreateListingDto, {
    type: ListingType.RENTAL,
    title: 'Private room in Dublin 8',
    description: 'Bright room close to public transport.',
    city: 'Dublin',
    area: 'Dublin 8',
    propertyType: PropertyType.SINGLE_ROOM,
    propertyOccupancyType: PropertyOccupancyType.SHARED_PROPERTY,
    advertisedSpaceType: AdvertisedSpaceType.PRIVATE,
    monthlyPriceCents: 90000,
    ...overrides,
  });
}

describe('CreateListingDto validation', () => {
  it('accepts a valid structured listing payload', async () => {
    await expect(
      validate(
        validRental({
          bedroomCount: 3,
          bathroomCount: 2,
          maxOccupants: 1,
          bathroomType: BathroomType.SHARED,
          peopleSharingBathroom: 3,
          kitchenAmenities: [KitchenAmenity.OVEN, KitchenAmenity.KETTLE],
          transportOptions: [
            {
              mode: TransportMode.LUAS,
              stopName: 'Fatima',
              walkingMinutes: 8,
            },
          ],
        }),
      ),
    ).resolves.toHaveLength(0);
  });

  it.each([
    ['title', '   '],
    ['description', '\t\n'],
    ['city', '   '],
    ['area', '\t'],
    ['extraCostsNote', '   '],
    ['houseRules', '\n'],
    ['transportInfo', '   '],
    ['otherRequirementsNote', '   '],
    ['quietHoursNote', '   '],
  ] as const)('rejects blank text in %s', async (field, value) => {
    const errors = await validate(validRental({ [field]: value }));

    expect(errors.some((error) => error.property === field)).toBe(true);
  });

  it('rejects invalid structured counts and stay duration', async () => {
    const errors = await validate(
      validRental({
        bedroomCount: -1,
        bathroomCount: 51,
        maxOccupants: 0,
        minimumStayDays: 0,
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'bedroomCount',
        'bathroomCount',
        'maxOccupants',
        'minimumStayDays',
      ]),
    );
  });

  it('rejects duplicate amenities', async () => {
    const errors = await validate(
      validRental({
        kitchenAmenities: [KitchenAmenity.OVEN, KitchenAmenity.OVEN],
      }),
    );

    expect(errors.some((error) => error.property === 'kitchenAmenities')).toBe(
      true,
    );
  });

  it('validates nested transport metadata', async () => {
    const errors = await validate(
      validRental({
        transportOptions: [
          {
            mode: TransportMode.BUS,
            stopName: '   ',
            walkingMinutes: 181,
          },
        ],
      }),
    );

    expect(errors.some((error) => error.property === 'transportOptions')).toBe(
      true,
    );
  });

  it('rejects text above configured maximum length', async () => {
    const errors = await validate(
      validRental({
        title: 'a'.repeat(121),
        description: 'b'.repeat(5001),
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['title', 'description']),
    );
  });

  it('rejects blank exchange areas and notes', async () => {
    const dto = plainToInstance(CreateListingDto, {
      type: ListingType.EXCHANGE,
      title: 'Exchange my room',
      description: 'Looking for another room in Dublin.',
      city: 'Dublin',
      area: 'Dublin 8',
      propertyType: PropertyType.SINGLE_ROOM,
      monthlyPriceCents: 90000,
      desiredAreas: ['Dublin 6', '   '],
      exchangeNotes: '   ',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['desiredAreas', 'exchangeNotes']),
    );
  });
});
