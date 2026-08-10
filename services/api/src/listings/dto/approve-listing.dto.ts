import { IsDateString } from 'class-validator';

export class ApproveListingDto {
  @IsDateString()
  expectedUpdatedAt!: string;
}
