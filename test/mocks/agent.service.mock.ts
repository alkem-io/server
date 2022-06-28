import { AgentService } from '@domain/agent/agent/agent.service';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';

export const MockAgentService: ValueProvider<PublicPart<AgentService>> = {
  provide: AgentService,
  useValue: {
    getSupportedCredentialMetadata: jest.fn(),
  },
};
