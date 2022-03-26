import { TrustRegistryCredentialMetadata } from '@services/platform/trust-registry/trust.registry.configuration/trust.registry.dto.credential.metadata';

export class WalletManagerOfferVcComplete {
  issuerDID!: string;
  issuerPassword!: string;
  credentialMetadata!: TrustRegistryCredentialMetadata[];
  interactionId!: string;
  jwt!: string;
}
