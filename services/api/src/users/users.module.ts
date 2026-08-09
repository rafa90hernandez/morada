import { Module } from '@nestjs/common';

import { ContactVerificationService } from './contact-verification.service';
import { IdentityEvidenceImageProcessor } from './identity-evidence-image.processor';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationSubmissionService } from './identity-verification-submission.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, IdentityVerificationController],
  providers: [
    UsersService,
    ContactVerificationService,
    IdentityEvidenceImageProcessor,
    IdentityVerificationSubmissionService,
  ],
  exports: [
    UsersService,
    ContactVerificationService,
    IdentityVerificationSubmissionService,
  ],
})
export class UsersModule {}
