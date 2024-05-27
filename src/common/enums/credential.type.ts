import { registerEnumType } from '@nestjs/graphql';
import { LicenseCredential } from './license.credential';
import { AuthorizationCredential } from './authorization.credential';

export const CredentialType = {
  ...LicenseCredential,
  ...AuthorizationCredential,
};

export type CredentialType = LicenseCredential | AuthorizationCredential;

registerEnumType(CredentialType, {
  name: 'CredentialType',
});
