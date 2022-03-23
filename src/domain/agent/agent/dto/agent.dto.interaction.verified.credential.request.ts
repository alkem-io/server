import { SsiIssuerType } from '@common/enums/ssi.issuer.type';
import { IAgent } from '../agent.interface';

export class AgentInteractionVerifiedCredentialRequest {
  nonce!: string;
  issuer!: SsiIssuerType;

  interactionId!: string;

  agent?: IAgent;
}
