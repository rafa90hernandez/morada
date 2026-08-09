import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const CONTAINS_NON_WHITESPACE = /\S/;

export class ListingPrivateLocationDto {
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(200)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @Matches(CONTAINS_NON_WHITESPACE)
  @MaxLength(20)
  eircode?: string;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-90)
  @Max(90)
  exactLatitude!: number;

  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-180)
  @Max(180)
  exactLongitude!: number;
}
