import { relations } from 'drizzle-orm';
import { organizationVerifications } from './organization.verification.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const organizationVerificationsRelations = relations(
  organizationVerifications,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [organizationVerifications.authorizationId],
      references: [authorizationPolicies.id],
    }),
  })
);
