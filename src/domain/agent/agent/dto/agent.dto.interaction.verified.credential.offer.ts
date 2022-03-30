import { SsiIssuerType } from '@common/enums/ssi.issuer.type';
import { WalletManagerCredentialOfferMetadata } from '@services/platform/wallet-manager-adapter/dto/wallet.manager.dto.credential.offer.metadata';
import { IAgent } from '../agent.interface';

export class AgentInteractionVerifiedCredentialOffer {
  nonce!: string;
  issuer!: SsiIssuerType;

  interactionId!: string;

  offeredCredentials: WalletManagerCredentialOfferMetadata[] = [];

  agent?: IAgent;
}
