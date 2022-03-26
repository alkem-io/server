import { WalletManagerCredentialMetadata } from './wallet.manager.dto.credential.metadata';

export class WalletManagerGetAgentInfo {
  did!: string;
  password!: string;
  credentialMetadata!: WalletManagerCredentialMetadata[];
}
