import { registerEnumType } from '@nestjs/graphql';

export enum OrganizationVerificationEnum {
  NOT_VERIFIED = 'not-verified',
  MANUAL_ATTESTATION = 'manual-attestation',
}

registerEnumType(OrganizationVerificationEnum, {
  name: 'OrganizationVerificationEnum',
});
