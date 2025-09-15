import { registerEnumType } from '@nestjs/graphql';

export enum IdentityVerificationStatusFilter {
  ALL = 'all',
  VERIFIED = 'verified',
  UNVERIFIED = 'unverified',
}

registerEnumType(IdentityVerificationStatusFilter, {
  name: 'IdentityVerificationStatusFilter',
  description: 'Filter for identity verification status',
});
