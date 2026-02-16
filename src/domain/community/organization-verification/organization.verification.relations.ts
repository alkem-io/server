import { relations } from 'drizzle-orm';
import { organizationVerifications } from './organization.verification.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { lifecycles } from '@domain/common/lifecycle/lifecycle.schema';

export const organizationVerificationsRelations = relations(
  organizationVerifications,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [organizationVerifications.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Lifecycle
    lifecycle: one(lifecycles, {
      fields: [organizationVerifications.lifecycleId],
      references: [lifecycles.id],
    }),
  })
);
