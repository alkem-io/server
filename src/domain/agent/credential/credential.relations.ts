import { relations } from 'drizzle-orm';
import { credentials } from './credential.schema';
import { agents } from '@domain/agent/agent/agent.schema';

export const credentialsRelations = relations(credentials, ({ one }) => ({
  // ManyToOne: Agent
  agent: one(agents, {
    fields: [credentials.agentId],
    references: [agents.id],
  }),
}));
