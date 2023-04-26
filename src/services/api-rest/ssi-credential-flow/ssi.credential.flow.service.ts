import { AgentService } from '@domain/agent/agent/agent.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SsiCredentialFlowService {
  constructor(private readonly agentService: AgentService) {}

  async completeCredentialRequestInteractionJolocom(
    nonce: string,
    token: string
  ) {
    await this.agentService.completeCredentialRequestInteractionJolocom(
      nonce,
      token
    );
  }

  async completeCredentialRequestInteractionSovrhd(nonce: string, data: any) {
    await this.agentService.completeCredentialRequestInteractionSovrhd(
      nonce,
      data
    );
  }

  // todo: return type?!
  async completeCredentialOfferInteraction(nonce: string, token: string) {
    return this.agentService.completeCredentialOfferInteraction(nonce, token);
  }
}
