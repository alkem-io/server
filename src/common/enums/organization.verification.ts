import { registerEnumType } from '@nestjs/graphql';

export enum OrganizationVerificationEnum {
  NOT_VERIFIED = 'not-verified',
  VERIFIED_MANUAL_ATTESTATION = 'verified-manual-attestation',
}

registerEnumType(OrganizationVerificationEnum, {
  name: 'OrganizationVerificationEnum',
});
