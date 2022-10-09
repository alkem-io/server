import { WalletManagerCredentialOfferMetadata } from '@services/adapters/wallet-manager-adapter/dto/wallet.manager.dto.credential.offer.metadata';

export class WalletManagerOfferVcBegin {
  issuerDID!: string;
  issuerPassword!: string;
  offeredCredentials!: WalletManagerCredentialOfferMetadata[];
  uniqueCallbackURL!: string;
}
