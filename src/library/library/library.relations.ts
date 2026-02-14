import { relations } from 'drizzle-orm';
import { libraries } from './library.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const librariesRelations = relations(libraries, ({ one }) => ({
  authorization: one(authorizationPolicies, {
    fields: [libraries.authorizationId],
    references: [authorizationPolicies.id],
  }),
}));
