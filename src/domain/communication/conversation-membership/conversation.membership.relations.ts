import { relations } from 'drizzle-orm';
import { conversationMemberships } from './conversation.membership.schema';
import { conversations } from '@domain/communication/conversation/conversation.schema';
import { agents } from '@domain/agent/agent/agent.schema';

export const conversationMembershipsRelations = relations(
  conversationMemberships,
  ({ one }) => ({
    // ManyToOne: Conversation
    conversation: one(conversations, {
      fields: [conversationMemberships.conversationId],
      references: [conversations.id],
    }),

    // ManyToOne: Agent
    agent: one(agents, {
      fields: [conversationMemberships.agentId],
      references: [agents.id],
    }),
  })
);
