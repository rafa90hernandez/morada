import {
  AdultEligibilityStatus,
  calculateAge,
  getAdultEligibility,
  MINIMUM_USER_AGE,
} from './adult-eligibility.policy';

describe('adult eligibility policy', () => {
  it('does not treat a missing date of birth as eligible', () => {
    expect(getAdultEligibility(null, new Date('2026-08-09T12:00:00.000Z'))).toEqual({
      status: AdultEligibilityStatus.MISSING_DATE_OF_BIRTH,
      minimumAge: MINIMUM_USER_AGE,
      age: null,
      isEligible: false,
    });
  });

  it('becomes eligible on the 18th birthday, not the day before', () => {
    const dateOfBirth = new Date('2008-08-09T00:00:00.000Z');

    expect(
      getAdultEligibility(
        dateOfBirth,
        new Date('2026-08-08T23:59:59.000Z'),
      ),
    ).toMatchObject({
      status: AdultEligibilityStatus.UNDERAGE,
      age: 17,
      isEligible: false,
    });

    expect(
      getAdultEligibility(dateOfBirth, new Date('2026-08-09T00:00:00.000Z')),
    ).toMatchObject({
      status: AdultEligibilityStatus.ELIGIBLE,
      age: 18,
      isEligible: true,
    });
  });

  it('uses a conservative March 1 anniversary for February 29 births in non-leap years', () => {
    const dateOfBirth = new Date('2008-02-29T00:00:00.000Z');

    expect(
      getAdultEligibility(dateOfBirth, new Date('2026-02-28T12:00:00.000Z')),
    ).toMatchObject({
      status: AdultEligibilityStatus.UNDERAGE,
      age: 17,
      isEligible: false,
    });

    expect(
      getAdultEligibility(dateOfBirth, new Date('2026-03-01T00:00:00.000Z')),
    ).toMatchObject({
      status: AdultEligibilityStatus.ELIGIBLE,
      age: 18,
      isEligible: true,
    });
  });

  it('uses February 29 as the anniversary in leap years', () => {
    const dateOfBirth = new Date('2008-02-29T00:00:00.000Z');

    expect(calculateAge(dateOfBirth, new Date('2028-02-28T12:00:00.000Z'))).toBe(
      19,
    );
    expect(calculateAge(dateOfBirth, new Date('2028-02-29T00:00:00.000Z'))).toBe(
      20,
    );
  });

  it('calculates age using UTC calendar components', () => {
    const dateOfBirth = new Date('1991-05-10T00:00:00.000Z');

    expect(calculateAge(dateOfBirth, new Date('2026-05-09T23:59:59.000Z'))).toBe(
      34,
    );
    expect(calculateAge(dateOfBirth, new Date('2026-05-10T00:00:00.000Z'))).toBe(
      35,
    );
  });

  it('rejects a future date of birth', () => {
    expect(() =>
      calculateAge(
        new Date('2027-01-01T00:00:00.000Z'),
        new Date('2026-08-09T00:00:00.000Z'),
      ),
    ).toThrow(RangeError);
  });
});
