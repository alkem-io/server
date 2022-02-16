import { AgentService } from '@domain/agent/agent/agent.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(private readonly agentService: AgentService) {}

  getHello(): string {
    return 'Hello Alkemio!';
  }

  async completeCredentialShareInteraction(nonce: string, token: string) {
    this.agentService.completeCredentialShareInteraction(nonce, token);
  }
}
