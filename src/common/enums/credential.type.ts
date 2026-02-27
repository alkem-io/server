import { registerEnumType } from '@nestjs/graphql';
import { AuthorizationCredential } from './authorization.credential';
import { LicensingCredentialBasedCredentialType } from './licensing.credential.based.credential.type';

export const CredentialType = {
  ...LicensingCredentialBasedCredentialType,
  ...AuthorizationCredential,
};

export type CredentialType =
  | LicensingCredentialBasedCredentialType
  | AuthorizationCredential;

registerEnumType(CredentialType, {
  name: 'CredentialType',
});
