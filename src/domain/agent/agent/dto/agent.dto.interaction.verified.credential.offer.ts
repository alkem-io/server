import { SsiIssuerType } from '@common/enums/ssi.issuer.type';
import { TrustRegistryVerifiedCredentialOffer } from '@services/platform/trust-registry/trust.registry.adapter/trust.registry.dto.offered.credential';
import { IAgent } from '../agent.interface';

export class AgentInteractionVerifiedCredentialOffer {
  nonce!: string;
  issuer!: SsiIssuerType;

  interactionId!: string;

  offeredCredentials: TrustRegistryVerifiedCredentialOffer[] = [];

  agent?: IAgent;
}
