import { Module } from '@nestjs/common';

import { AdminIdentityVerificationController } from './admin-identity-verification.controller';
import { AdminIdentityVerificationService } from './admin-identity-verification.service';
import { ContactVerificationService } from './contact-verification.service';
import { IdentityEvidenceImageProcessor } from './identity-evidence-image.processor';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationSubmissionService } from './identity-verification-submission.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [
    UsersController,
    IdentityVerificationController,
    AdminIdentityVerificationController,
  ],
  providers: [
    UsersService,
    ContactVerificationService,
    IdentityEvidenceImageProcessor,
    IdentityVerificationSubmissionService,
    AdminIdentityVerificationService,
  ],
  exports: [
    UsersService,
    ContactVerificationService,
    IdentityVerificationSubmissionService,
    AdminIdentityVerificationService,
  ],
})
export class UsersModule {}
