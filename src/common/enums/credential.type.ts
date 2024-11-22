import { registerEnumType } from '@nestjs/graphql';
import { LicensingCredentialBasedCredentialType } from './licensing.credental.based.credential.type';
import { AuthorizationCredential } from './authorization.credential';

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
