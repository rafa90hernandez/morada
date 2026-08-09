export const MINIMUM_USER_AGE = 18;

export enum AdultEligibilityStatus {
  MISSING_DATE_OF_BIRTH = 'MISSING_DATE_OF_BIRTH',
  UNDERAGE = 'UNDERAGE',
  ELIGIBLE = 'ELIGIBLE',
}

export type AdultEligibility = {
  status: AdultEligibilityStatus;
  minimumAge: number;
  age: number | null;
  isEligible: boolean;
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function birthdayForYear(dateOfBirth: Date, year: number) {
  const month = dateOfBirth.getUTCMonth();
  const day = dateOfBirth.getUTCDate();

  if (month === 1 && day === 29 && !isLeapYear(year)) {
    return {
      month: 2,
      day: 1,
    };
  }

  return {
    month,
    day,
  };
}

export function calculateAge(
  dateOfBirth: Date,
  referenceDate: Date = new Date(),
): number {
  if (
    Number.isNaN(dateOfBirth.getTime()) ||
    Number.isNaN(referenceDate.getTime())
  ) {
    throw new RangeError('Age calculation requires valid dates.');
  }

  if (dateOfBirth.getTime() > referenceDate.getTime()) {
    throw new RangeError('Date of birth cannot be in the future.');
  }

  const birthYear = dateOfBirth.getUTCFullYear();
  const referenceYear = referenceDate.getUTCFullYear();
  let age = referenceYear - birthYear;

  const birthday = birthdayForYear(dateOfBirth, referenceYear);
  const referenceMonth = referenceDate.getUTCMonth();
  const referenceDay = referenceDate.getUTCDate();

  const birthdayHasOccurred =
    referenceMonth > birthday.month ||
    (referenceMonth === birthday.month && referenceDay >= birthday.day);

  if (!birthdayHasOccurred) {
    age -= 1;
  }

  return age;
}

export function getAdultEligibility(
  dateOfBirth: Date | null | undefined,
  referenceDate: Date = new Date(),
): AdultEligibility {
  if (!dateOfBirth) {
    return {
      status: AdultEligibilityStatus.MISSING_DATE_OF_BIRTH,
      minimumAge: MINIMUM_USER_AGE,
      age: null,
      isEligible: false,
    };
  }

  const age = calculateAge(dateOfBirth, referenceDate);
  const isEligible = age >= MINIMUM_USER_AGE;

  return {
    status: isEligible
      ? AdultEligibilityStatus.ELIGIBLE
      : AdultEligibilityStatus.UNDERAGE,
    minimumAge: MINIMUM_USER_AGE,
    age,
    isEligible,
  };
}
