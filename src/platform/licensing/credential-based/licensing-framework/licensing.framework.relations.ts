import { relations } from 'drizzle-orm';
import { licensingFrameworks } from './licensing.framework.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { licensePlans } from '@platform/licensing/credential-based/license-plan/license.plan.schema';
import { licensePolicies } from '@platform/licensing/credential-based/license-policy/license.policy.schema';

export const licensingFrameworksRelations = relations(
  licensingFrameworks,
  ({ one, many }) => ({
    authorization: one(authorizationPolicies, {
      fields: [licensingFrameworks.authorizationId],
      references: [authorizationPolicies.id],
    }),
    plans: many(licensePlans),
    licensePolicy: one(licensePolicies, {
      fields: [licensingFrameworks.licensePolicyId],
      references: [licensePolicies.id],
    }),
  })
);
