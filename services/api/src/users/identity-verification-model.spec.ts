import {
  IdentityDocumentType,
  IdentityEvidenceType,
  IdentityVerificationStatus,
} from '../generated/prisma/enums';

describe('identity verification model contract', () => {
  it('supports the approved Beta 1 identity documents only', () => {
    expect(Object.values(IdentityDocumentType)).toEqual([
      'PASSPORT',
      'EU_EEA_NATIONAL_ID',
      'DRIVING_LICENCE',
      'IRP',
    ]);
  });

  it('uses explicit typed lifecycle states', () => {
    expect(Object.values(IdentityVerificationStatus)).toEqual([
      'SUBMITTED',
      'UNDER_REVIEW',
      'CORRECTION_REQUIRED',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]);
  });

  it('distinguishes document evidence from the selfie evidence', () => {
    expect(Object.values(IdentityEvidenceType)).toEqual([
      'DOCUMENT_FRONT',
      'DOCUMENT_BACK',
      'SELFIE_WITH_DOCUMENT',
    ]);
  });
});
