import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../database/database.service', () => ({
  DatabaseService: class DatabaseService {},
}));

import { LocationStatus } from '../generated/prisma/enums';
import { UsersService } from './users.service';

describe('UsersService profile updates', () => {
  const findUnique = jest.fn();
  const updateProfileRecord = jest.fn();
  const database = {
    user: {
      findUnique,
    },
    userProfile: {
      update: updateProfileRecord,
    },
  };
  const service = new UsersService(database as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes allowed profile fields and returns the hydrated user', async () => {
    const existingUser = {
      id: 'user-id',
      profile: { id: 'profile-id' },
    };
    const updatedUser = {
      ...existingUser,
      profile: {
        ...existingUser.profile,
        displayName: 'Rafa',
        fullName: 'Rafael Hernandez',
      },
    };

    findUnique
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(updatedUser);
    updateProfileRecord.mockResolvedValue(updatedUser.profile);

    await expect(
      service.updateProfile('user-id', {
        displayName: '  Rafa  ',
        fullName: '  Rafael Hernandez  ',
        dateOfBirth: '1991-05-10',
        nationality: '  Brazilian  ',
        hometown: '  Guaíra  ',
        bio: '  Morada user  ',
        primaryLanguage: '  pt-BR  ',
        currentLocationStatus: LocationStatus.IN_IRELAND,
        currentCity: '  Dublin  ',
        arrivalDate: '2026-05-09',
        occupation: '  Developer  ',
        isStudent: true,
      }),
    ).resolves.toBe(updatedUser);

    expect(updateProfileRecord).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
      },
      data: {
        displayName: 'Rafa',
        fullName: 'Rafael Hernandez',
        dateOfBirth: new Date('1991-05-10'),
        nationality: 'Brazilian',
        hometown: 'Guaíra',
        bio: 'Morada user',
        primaryLanguage: 'pt-BR',
        currentLocationStatus: LocationStatus.IN_IRELAND,
        currentCity: 'Dublin',
        arrivalDate: new Date('2026-05-09'),
        occupation: 'Developer',
        isStudent: true,
      },
    });
  });

  it('rejects an underage date of birth before writing', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-09T12:00:00.000Z'));
    findUnique.mockResolvedValue({
      id: 'user-id',
      profile: { id: 'profile-id' },
    });

    await expect(
      service.updateProfile('user-id', {
        dateOfBirth: '2008-08-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updateProfileRecord).not.toHaveBeenCalled();
  });

  it('accepts the date of birth on the exact 18th birthday', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-09T12:00:00.000Z'));

    const existingUser = {
      id: 'user-id',
      profile: { id: 'profile-id' },
    };
    const updatedUser = {
      ...existingUser,
      profile: { id: 'profile-id', dateOfBirth: new Date('2008-08-09') },
    };

    findUnique
      .mockResolvedValueOnce(existingUser)
      .mockResolvedValueOnce(updatedUser);
    updateProfileRecord.mockResolvedValue(updatedUser.profile);

    await expect(
      service.updateProfile('user-id', {
        dateOfBirth: '2008-08-09',
      }),
    ).resolves.toBe(updatedUser);

    expect(updateProfileRecord).toHaveBeenCalled();
  });

  it('rejects a date of birth in the future before writing', async () => {
    findUnique.mockResolvedValue({
      id: 'user-id',
      profile: { id: 'profile-id' },
    });

    await expect(
      service.updateProfile('user-id', {
        dateOfBirth: '2999-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(updateProfileRecord).not.toHaveBeenCalled();
  });

  it('rejects updates when the authenticated profile no longer exists', async () => {
    findUnique.mockResolvedValue({
      id: 'user-id',
      profile: null,
    });

    await expect(
      service.updateProfile('user-id', { displayName: 'Rafa' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(updateProfileRecord).not.toHaveBeenCalled();
  });
});
