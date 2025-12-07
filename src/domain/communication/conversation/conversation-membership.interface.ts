import { IAgent } from '@domain/agent/agent/agent.interface';
import { IConversation } from './conversation.interface';

export interface IConversationMembership {
  conversationId: string;
  agentId: string;
  conversation: IConversation;
  agent: IAgent;
  createdAt: Date;
}
