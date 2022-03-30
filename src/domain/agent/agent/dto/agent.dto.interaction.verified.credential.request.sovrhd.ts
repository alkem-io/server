import { IAgent } from '../agent.interface';

export class AgentInteractionVerifiedCredentialRequestSovrhd {
  nonce!: string;

  interactionId!: string;
  sovrhdSessionId!: string;
  credentialType!: string;

  agent!: IAgent;
}
