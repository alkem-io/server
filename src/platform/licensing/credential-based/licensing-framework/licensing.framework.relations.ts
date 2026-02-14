import { relations } from 'drizzle-orm';
import { licensingFrameworks } from './licensing.framework.schema';
import { licensePlans } from '@platform/licensing/credential-based/license-plan/license.plan.schema';
import { licensePolicies } from '@platform/licensing/credential-based/license-policy/license.policy.schema';

export const licensingFrameworksRelations = relations(
  licensingFrameworks,
  ({ one, many }) => ({
    plans: many(licensePlans),
    licensePolicy: one(licensePolicies, {
      fields: [licensingFrameworks.licensePolicyId],
      references: [licensePolicies.id],
    }),
  })
);
