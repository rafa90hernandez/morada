import { IsEnum } from 'class-validator';

export enum VisitOutcome {
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export class VisitOutcomeDto {
  @IsEnum(VisitOutcome)
  outcome!: VisitOutcome;
}
