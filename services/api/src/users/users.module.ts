import { Module } from '@nestjs/common';

import { ContactVerificationService } from './contact-verification.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, ContactVerificationService],
  exports: [UsersService, ContactVerificationService],
})
export class UsersModule {}
