import { registerEnumType } from '@nestjs/graphql';

export enum OrganizationVerificationEnum {
  NOT_VERIFIED = 'Not verified',
  MANUAL_ATTESTATION = 'Manual attestation',
}

registerEnumType(OrganizationVerificationEnum, {
  name: 'OrganizationVerificationEnum',
});
