import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { LocationStatus } from '../../generated/prisma/enums';
import { UpdateProfileDto } from './update-profile.dto';

function profileUpdate(overrides: Partial<UpdateProfileDto> = {}) {
  return plainToInstance(UpdateProfileDto, {
    displayName: 'Rafa',
    fullName: 'Rafael Hernandez',
    dateOfBirth: '1991-05-10',
    nationality: 'Brazilian',
    hometown: 'Guaíra',
    primaryLanguage: 'pt-BR',
    currentLocationStatus: LocationStatus.IN_IRELAND,
    currentCity: 'Dublin',
    occupation: 'Developer',
    isStudent: true,
    ...overrides,
  });
}

describe('UpdateProfileDto validation', () => {
  it('accepts a valid partial profile payload', async () => {
    await expect(
      validate(plainToInstance(UpdateProfileDto, { displayName: 'Rafa' })),
    ).resolves.toHaveLength(0);
  });

  it.each([
    ['displayName', '   '],
    ['fullName', '\t'],
    ['nationality', '\n'],
    ['hometown', '   '],
    ['primaryLanguage', '\t'],
    ['currentCity', '   '],
    ['occupation', '\n'],
  ] as const)('rejects blank text in %s', async (field, value) => {
    const errors = await validate(profileUpdate({ [field]: value }));

    expect(errors.some((error) => error.property === field)).toBe(true);
  });

  it('rejects malformed dates', async () => {
    const errors = await validate(
      profileUpdate({
        dateOfBirth: 'not-a-date',
        arrivalDate: 'tomorrow-ish',
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['dateOfBirth', 'arrivalDate']),
    );
  });

  it('rejects text above configured maximum lengths', async () => {
    const errors = await validate(
      profileUpdate({
        displayName: 'a'.repeat(81),
        fullName: 'b'.repeat(161),
        nationality: 'c'.repeat(101),
        hometown: 'd'.repeat(121),
      }),
    );

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'displayName',
        'fullName',
        'nationality',
        'hometown',
      ]),
    );
  });
});
