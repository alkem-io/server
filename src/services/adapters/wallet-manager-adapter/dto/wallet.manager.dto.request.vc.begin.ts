import { TrustRegistryCredentialMetadata } from '@services/external/trust-registry/trust.registry.configuration/trust.registry.dto.credential.metadata';

export class WalletManagerRequestVcBegin {
  issuerDID!: string;
  issuerPassword!: string;
  credentialMetadata!: TrustRegistryCredentialMetadata[];
  uniqueCallbackURL!: string;
}
