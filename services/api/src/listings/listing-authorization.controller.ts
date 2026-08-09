import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingAuthorizationEvidenceType } from '../generated/prisma/enums';
import { ListingAuthorizationEvidenceProcessor } from './listing-authorization-evidence.processor';
import {
  ListingAuthorizationSubmissionService,
  type ListingAuthorizationEvidenceUpload,
  type ListingAuthorizationSubmissionFile,
} from './listing-authorization-submission.service';

type AuthorizationUploadFields = {
  tenancyAgreement?: Express.Multer.File[];
  landlordAuthorization?: Express.Multer.File[];
  proofOfOwnership?: Express.Multer.File[];
  agencyMandate?: Express.Multer.File[];
  otherSupportingDocument?: Express.Multer.File[];
};

@ApiTags('Listing authorization')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('listings/me/:listingId/authorization')
export class ListingAuthorizationController {
  constructor(
    private readonly submissionService: ListingAuthorizationSubmissionService,
  ) {}

  @Post('submissions')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'tenancyAgreement', maxCount: 5 },
        { name: 'landlordAuthorization', maxCount: 5 },
        { name: 'proofOfOwnership', maxCount: 5 },
        { name: 'agencyMandate', maxCount: 5 },
        { name: 'otherSupportingDocument', maxCount: 5 },
      ],
      {
        limits: {
          fileSize: ListingAuthorizationEvidenceProcessor.MAX_INPUT_SIZE_BYTES,
          files: 5,
        },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit private evidence of the right to advertise a listing',
  })
  @ApiCreatedResponse({
    description:
      'Evidence stored privately and the listing authorization attempt queued for manual review.',
  })
  submit(
    @CurrentUser('id') authenticatedUserId: string,
    @Param('listingId') listingId: string,
    @UploadedFiles() files: AuthorizationUploadFields,
  ) {
    return this.submissionService.submit({
      authenticatedUserId,
      listingId,
      evidence: this.toEvidence(files),
    });
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Read the latest authorization attempt for an owned listing',
  })
  getLatest(
    @CurrentUser('id') authenticatedUserId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.submissionService.getLatestForOwner(
      authenticatedUserId,
      listingId,
    );
  }

  private toEvidence(
    files: AuthorizationUploadFields,
  ): ListingAuthorizationEvidenceUpload[] {
    return [
      ...this.mapFiles(
        files?.tenancyAgreement,
        ListingAuthorizationEvidenceType.TENANCY_AGREEMENT,
      ),
      ...this.mapFiles(
        files?.landlordAuthorization,
        ListingAuthorizationEvidenceType.LANDLORD_AUTHORIZATION,
      ),
      ...this.mapFiles(
        files?.proofOfOwnership,
        ListingAuthorizationEvidenceType.PROOF_OF_OWNERSHIP,
      ),
      ...this.mapFiles(
        files?.agencyMandate,
        ListingAuthorizationEvidenceType.AGENCY_MANDATE,
      ),
      ...this.mapFiles(
        files?.otherSupportingDocument,
        ListingAuthorizationEvidenceType.OTHER_SUPPORTING_DOCUMENT,
      ),
    ];
  }

  private mapFiles(
    files: Express.Multer.File[] | undefined,
    type: ListingAuthorizationEvidenceType,
  ): ListingAuthorizationEvidenceUpload[] {
    return (files ?? []).map((file) => ({
      type,
      file: this.toSubmissionFile(file),
    }));
  }

  private toSubmissionFile(
    file: Express.Multer.File,
  ): ListingAuthorizationSubmissionFile {
    return {
      buffer: file.buffer,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      originalFileName: file.originalname,
    };
  }
}
