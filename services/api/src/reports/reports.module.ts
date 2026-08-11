import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ReportAdminController } from './report-admin.controller';
import { ReportAdminService } from './report-admin.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController, ReportAdminController],
  providers: [ReportsService, ReportAdminService],
  exports: [ReportsService, ReportAdminService],
})
export class ReportsModule {}
