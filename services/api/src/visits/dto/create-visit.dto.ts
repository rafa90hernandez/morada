import { IsISO8601 } from 'class-validator';

export class CreateVisitDto {
  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsISO8601({ strict: true })
  endsAt!: string;
}
