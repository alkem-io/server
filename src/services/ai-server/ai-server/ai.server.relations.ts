import { relations } from 'drizzle-orm';
import { aiServers } from './ai.server.schema';
import { aiPersonas } from '../ai-persona/ai.persona.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const aiServersRelations = relations(aiServers, ({ one, many }) => ({
  aiPersonas: many(aiPersonas),
  authorization: one(authorizationPolicies, {
    fields: [aiServers.authorizationId],
    references: [authorizationPolicies.id],
  }),
}));
