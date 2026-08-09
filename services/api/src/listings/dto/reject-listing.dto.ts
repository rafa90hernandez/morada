import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class RejectListingDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'reason must contain non-whitespace characters' })
  @MaxLength(1000)
  reason!: string;
}
