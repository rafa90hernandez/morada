import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { IdentityDocumentType } from '../../generated/prisma/enums';

export class CreateIdentityVerificationSubmissionDto {
  @ApiProperty({
    enum: IdentityDocumentType,
    enumName: 'IdentityDocumentType',
  })
  @IsEnum(IdentityDocumentType)
  documentType!: IdentityDocumentType;
}
