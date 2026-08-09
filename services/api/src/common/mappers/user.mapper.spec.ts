import { AdultEligibilityStatus } from '../../users/policies/adult-eligibility.policy';
import { UserMapper } from './user.mapper';

function userWithDateOfBirth(dateOfBirth: Date | null) {
  return {
    id: 'user-id',
    email: 'user@example.com',
    role: 'USER',
    status: 'ACTIVE',
    emailVerified: false,
    phoneVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    profile: {
      id: 'profile-id',
      userId: 'user-id',
      displayName: 'Rafa',
      fullName: 'Rafael Hernandez',
      dateOfBirth,
      nationality: 'Brazilian',
      hometown: 'Guaíra',
      phone: null,
      profilePhotoUrl: null,
      profilePhotoPublicId: null,
      bio: null,
      primaryLanguage: 'pt-BR',
      currentLocationStatus: 'IN_IRELAND',
      currentCity: 'Dublin',
      arrivalDate: null,
      occupation: 'Developer',
      isStudent: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    verification: null,
    trustScore: null,
  };
}

describe('UserMapper eligibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-09T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks a missing date of birth as ineligible in the private response', () => {
    const response = UserMapper.toPrivateResponse(
      userWithDateOfBirth(null) as never,
    );

    expect(response.eligibility).toEqual({
      status: AdultEligibilityStatus.MISSING_DATE_OF_BIRTH,
      minimumAge: 18,
      age: null,
      isEligible: false,
    });
  });

  it('exposes derived age publicly without exposing full name or date of birth', () => {
    const response = UserMapper.toPublicResponse(
      userWithDateOfBirth(new Date('1991-05-10T00:00:00.000Z')) as never,
    );

    expect(response.profile).toMatchObject({
      displayName: 'Rafa',
      age: 35,
      nationality: 'Brazilian',
      hometown: 'Guaíra',
    });
    expect(response.profile).not.toHaveProperty('fullName');
    expect(response.profile).not.toHaveProperty('dateOfBirth');
  });

  it('does not expose an underage age in the public response', () => {
    const response = UserMapper.toPublicResponse(
      userWithDateOfBirth(new Date('2010-05-10T00:00:00.000Z')) as never,
    );

    expect(response.profile?.age).toBeNull();
  });
});
