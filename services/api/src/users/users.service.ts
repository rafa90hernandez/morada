import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  findByEmail(email: string) {
    return this.database.user.findUnique({
      where: { email },
      include: {
        profile: true,
        verification: true,
        trustScore: true,
      },
    });
  }

  findById(id: string) {
    return this.database.user.findUnique({
      where: { id },
      include: {
        profile: true,
        verification: true,
        trustScore: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findById(userId);

    if (!user?.profile) {
      throw new NotFoundException('User profile not found.');
    }

    const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined;

    if (dateOfBirth && dateOfBirth.getTime() > Date.now()) {
      throw new BadRequestException('Date of birth cannot be in the future.');
    }

    await this.database.userProfile.update({
      where: {
        userId,
      },
      data: {
        ...(dto.displayName !== undefined && {
          displayName: dto.displayName.trim(),
        }),
        ...(dto.fullName !== undefined && {
          fullName: dto.fullName.trim(),
        }),
        ...(dateOfBirth !== undefined && {
          dateOfBirth,
        }),
        ...(dto.nationality !== undefined && {
          nationality: dto.nationality.trim(),
        }),
        ...(dto.hometown !== undefined && {
          hometown: dto.hometown.trim(),
        }),
        ...(dto.bio !== undefined && {
          bio: dto.bio.trim(),
        }),
        ...(dto.primaryLanguage !== undefined && {
          primaryLanguage: dto.primaryLanguage.trim(),
        }),
        ...(dto.currentLocationStatus !== undefined && {
          currentLocationStatus: dto.currentLocationStatus,
        }),
        ...(dto.currentCity !== undefined && {
          currentCity: dto.currentCity.trim(),
        }),
        ...(dto.arrivalDate !== undefined && {
          arrivalDate: new Date(dto.arrivalDate),
        }),
        ...(dto.occupation !== undefined && {
          occupation: dto.occupation.trim(),
        }),
        ...(dto.isStudent !== undefined && {
          isStudent: dto.isStudent,
        }),
      },
    });

    const updatedUser = await this.findById(userId);

    if (!updatedUser) {
      throw new NotFoundException('User not found after profile update.');
    }

    return updatedUser;
  }
}
