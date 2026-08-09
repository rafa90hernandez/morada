import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdentityDocumentType } from '../generated/prisma/enums';
import { CreateIdentityVerificationSubmissionDto } from './dto/create-identity-verification-submission.dto';
import { IdentityEvidenceImageProcessor } from './identity-evidence-image.processor';
import {
  IdentityVerificationSubmissionService,
  type IdentitySubmissionFile,
} from './identity-verification-submission.service';

type IdentityUploadFields = {
  documentFront?: Express.Multer.File[];
  documentBack?: Express.Multer.File[];
  selfieWithDocument?: Express.Multer.File[];
};

@ApiTags('Identity verification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/identity-verification')
export class IdentityVerificationController {
  constructor(
    private readonly submissionService: IdentityVerificationSubmissionService,
  ) {}

  @Post('submissions')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'documentFront', maxCount: 1 },
        { name: 'documentBack', maxCount: 1 },
        { name: 'selfieWithDocument', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: IdentityEvidenceImageProcessor.MAX_INPUT_SIZE_BYTES,
          files: 3,
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Submit identity document and selfie for manual verification',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['documentType', 'documentFront', 'selfieWithDocument'],
      properties: {
        documentType: {
          type: 'string',
          enum: Object.values(IdentityDocumentType),
        },
        documentFront: {
          type: 'string',
          format: 'binary',
        },
        documentBack: {
          type: 'string',
          format: 'binary',
          description: 'Optional unless later requested for the document.',
        },
        selfieWithDocument: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Identity evidence stored privately and submission queued for manual review.',
  })
  submit(
    @CurrentUser('id') authenticatedUserId: string,
    @Body() dto: CreateIdentityVerificationSubmissionDto,
    @UploadedFiles() files: IdentityUploadFields,
  ) {
    return this.submissionService.submit({
      authenticatedUserId,
      documentType: dto.documentType,
      documentFront: this.toSubmissionFile(files?.documentFront?.[0]),
      documentBack: this.toSubmissionFile(files?.documentBack?.[0]),
      selfieWithDocument: this.toSubmissionFile(files?.selfieWithDocument?.[0]),
    });
  }

  private toSubmissionFile(
    file?: Express.Multer.File,
  ): IdentitySubmissionFile | undefined {
    if (!file) {
      return undefined;
    }

    return {
      buffer: file.buffer,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}
