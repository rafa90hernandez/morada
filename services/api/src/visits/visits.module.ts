import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [DatabaseModule],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
