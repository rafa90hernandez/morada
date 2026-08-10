import { IsBoolean } from 'class-validator';

export class ApproveListingAuthorizationDto {
  @IsBoolean()
  relationshipVerified!: boolean;

  @IsBoolean()
  landlordAuthorizationVerified!: boolean;
}
