import { relations } from 'drizzle-orm';
import { aiPersonas } from './ai.persona.schema';
import { aiServers } from '../ai-server/ai.server.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const aiPersonasRelations = relations(aiPersonas, ({ one }) => ({
  aiServer: one(aiServers, {
    fields: [aiPersonas.aiServerId],
    references: [aiServers.id],
  }),
  authorization: one(authorizationPolicies, {
    fields: [aiPersonas.authorizationId],
    references: [authorizationPolicies.id],
  }),
}));
