import { CredentialMetadata } from '@services/platform/trust-registry/trust.registry.configuration/credential.metadata';

export class WalletManagerOfferVcComplete {
  issuerDID!: string;
  issuerPassword!: string;
  credentialMetadata!: CredentialMetadata[];
  interactionId!: string;
  jwt!: string;
}
