import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListingPrivateLocationDto } from './listing-private-location.dto';

function validLocation(overrides: Partial<ListingPrivateLocationDto> = {}) {
  return plainToInstance(ListingPrivateLocationDto, {
    city: 'Dublin',
    area: 'Dublin 8',
    county: 'Dublin',
    postalDistrict: 'D08',
    addressLine1: '10 Example Street',
    eircode: 'D08 AB12',
    exactLatitude: 53.33911,
    exactLongitude: -6.29453,
    ...overrides,
  });
}

describe('ListingPrivateLocationDto', () => {
  it('accepts a complete Irish listing location', async () => {
    await expect(validate(validLocation())).resolves.toHaveLength(0);
  });

  it.each([
    ['city', '   '],
    ['area', '\t'],
    ['county', '\n'],
    ['addressLine1', '   '],
    ['eircode', '   '],
  ] as const)('rejects blank text in %s', async (field, value) => {
    const errors = await validate(validLocation({ [field]: value }));

    expect(errors.some((error) => error.property === field)).toBe(true);
  });

  it('rejects coordinates outside geographic bounds', async () => {
    const errors = await validate(
      validLocation({
        exactLatitude: 91,
        exactLongitude: -181,
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['exactLatitude', 'exactLongitude']),
    );
  });

  it('rejects excessive coordinate precision', async () => {
    const errors = await validate(
      validLocation({
        exactLatitude: 53.339111111,
      }),
    );

    expect(errors.some((error) => error.property === 'exactLatitude')).toBe(
      true,
    );
  });
});
