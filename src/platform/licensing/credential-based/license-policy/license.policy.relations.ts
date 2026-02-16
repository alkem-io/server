import { relations } from 'drizzle-orm';
import { licensePolicies } from './license.policy.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const licensePoliciesRelations = relations(
  licensePolicies,
  ({ one }) => ({
    authorization: one(authorizationPolicies, {
      fields: [licensePolicies.authorizationId],
      references: [authorizationPolicies.id],
    }),
  })
);
