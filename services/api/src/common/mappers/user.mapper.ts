import type { Prisma } from '../../generated/prisma/client';

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
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,

      profile: user.profile
        ? {
            id: user.profile.id,
            displayName: user.profile.displayName,
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
    return {
      id: user.id,
      status: user.status,
      createdAt: user.createdAt,

      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            profilePhotoUrl: user.profile.profilePhotoUrl,
            bio: user.profile.bio,
            primaryLanguage: user.profile.primaryLanguage,
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
