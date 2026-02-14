import { Agent } from '@domain/agent/agent/agent.entity';
import { Conversation } from '../conversation/conversation.entity';
import { IConversationMembership } from './conversation.membership.interface';

export class ConversationMembership implements IConversationMembership {
  conversationId!: string;

  agentId!: string;

  conversation!: Conversation;

  agent!: Agent;

  createdAt!: Date;
}
