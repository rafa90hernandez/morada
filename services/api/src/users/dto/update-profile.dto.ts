import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { LocationStatus } from '../../generated/prisma/enums';

const CONTAINS_NON_WHITESPACE = /\S/;
const NON_BLANK_MESSAGE = 'must contain at least one non-whitespace character';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `displayName ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `fullName ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `nationality ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `hometown ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(120)
  hometown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `primaryLanguage ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(20)
  primaryLanguage?: string;

  @IsOptional()
  @IsEnum(LocationStatus)
  currentLocationStatus?: LocationStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `currentCity ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(120)
  currentCity?: string;

  @IsOptional()
  @IsDateString()
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CONTAINS_NON_WHITESPACE, {
    message: `occupation ${NON_BLANK_MESSAGE}`,
  })
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @IsBoolean()
  isStudent?: boolean;
}
