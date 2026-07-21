import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsRepository],
  exports: [ListingsRepository],
})
export class ListingsModule {}
