import { WalletManagerCredentialMetadata } from '@services/adapters/wallet-manager-adapter/dto/wallet.manager.dto.credential.metadata';

export class TrustRegistryCredentialMetadata extends WalletManagerCredentialMetadata {
  issuer!: string;
  trusted_issuers?: string[];
  requestable!: boolean;
}
