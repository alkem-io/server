import { registerEnumType } from '@nestjs/graphql';

export enum MemoSignatureVerificationStatus {
  VERIFIED = 'VERIFIED',
  INVALID = 'INVALID',
  UNAVAILABLE = 'UNAVAILABLE',
}

registerEnumType(MemoSignatureVerificationStatus, {
  name: 'MemoSignatureVerificationStatus',
});
