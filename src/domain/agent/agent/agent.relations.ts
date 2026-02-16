import { relations } from 'drizzle-orm';
import { agents } from './agent.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { credentials } from '@domain/agent/credential/credential.schema';

export const agentsRelations = relations(agents, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [agents.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToMany: credentials
  credentials: many(credentials),
}));
