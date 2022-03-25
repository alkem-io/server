import { CredentialMetadata } from '@services/platform/trust-registry/trust.registry.configuration/credential.metadata';

export class WalletManagerRequestVcBegin {
  issuerDID!: string;
  issuerPassword!: string;
  credentialMetadata!: CredentialMetadata[];
  uniqueCallbackURL!: string;
}
