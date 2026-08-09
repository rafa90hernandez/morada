import type { Prisma } from '../../generated/prisma/client';
import { getAdultEligibility } from '../../users/policies/adult-eligibility.policy';

export type PrivateUserWithRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    verification: true;
    trustScore: true;
  };
}>;

export type PublicUserWithRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    trustScore: true;
  };
}>;

export class UserMapper {
  static toPrivateResponse(user: PrivateUserWithRelations) {
    const eligibility = getAdultEligibility(user.profile?.dateOfBirth);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      eligibility,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,

      profile: user.profile
        ? {
            id: user.profile.id,
            displayName: user.profile.displayName,
            fullName: user.profile.fullName,
            dateOfBirth: user.profile.dateOfBirth,
            age: eligibility.age,
            nationality: user.profile.nationality,
            hometown: user.profile.hometown,
            phone: user.profile.phone,
            profilePhotoUrl: user.profile.profilePhotoUrl,
            bio: user.profile.bio,
            primaryLanguage: user.profile.primaryLanguage,
            currentLocationStatus: user.profile.currentLocationStatus,
            currentCity: user.profile.currentCity,
            arrivalDate: user.profile.arrivalDate,
            occupation: user.profile.occupation,
            isStudent: user.profile.isStudent,
            createdAt: user.profile.createdAt,
            updatedAt: user.profile.updatedAt,
          }
        : null,

      verification: user.verification
        ? {
            emailVerifiedAt: user.verification.emailVerifiedAt,
            phoneVerifiedAt: user.verification.phoneVerifiedAt,
            documentStatus: user.verification.documentStatus,
            documentSubmittedAt: user.verification.documentSubmittedAt,
            documentReviewedAt: user.verification.documentReviewedAt,
          }
        : null,

      trustScore: user.trustScore
        ? {
            score: user.trustScore.score,
            level: user.trustScore.level,
            lastCalculatedAt: user.trustScore.lastCalculatedAt,
          }
        : null,
    };
  }

  static toPublicResponse(user: PublicUserWithRelations) {
    const eligibility = getAdultEligibility(user.profile?.dateOfBirth);

    return {
      id: user.id,
      status: user.status,
      createdAt: user.createdAt,

      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            age: eligibility.isEligible ? eligibility.age : null,
            profilePhotoUrl: user.profile.profilePhotoUrl,
            bio: user.profile.bio,
            primaryLanguage: user.profile.primaryLanguage,
            nationality: user.profile.nationality,
            hometown: user.profile.hometown,
            currentLocationStatus: user.profile.currentLocationStatus,
            currentCity: user.profile.currentCity,
            occupation: user.profile.occupation,
            isStudent: user.profile.isStudent,
          }
        : null,

      trustScore: user.trustScore
        ? {
            score: user.trustScore.score,
            level: user.trustScore.level,
          }
        : null,
    };
  }
}
