import { relations } from 'drizzle-orm';
import { authorizationPolicies } from './authorization.policy.schema';

export const authorizationPoliciesRelations = relations(
  authorizationPolicies,
  ({ one }) => ({
    // ManyToOne: self-referencing parent authorization policy
    parentAuthorizationPolicy: one(authorizationPolicies, {
      fields: [authorizationPolicies.parentAuthorizationPolicyId],
      references: [authorizationPolicies.id],
      relationName: 'parentChild',
    }),
  })
);
