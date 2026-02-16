import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';

export const conversationMemberships = pgTable(
  'conversation_membership',
  {
    conversationId: uuid('conversationId').notNull(),
    agentId: uuid('agentId').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.agentId] }),
    index('IDX_conversation_membership_agentId').on(table.agentId),
    index('IDX_conversation_membership_conversationId').on(table.conversationId),
  ]
);
