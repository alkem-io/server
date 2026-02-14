import { relations } from 'drizzle-orm';
import { licenses } from './license.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { licenseEntitlements } from '@domain/common/license-entitlement/license.entitlement.schema';

export const licensesRelations = relations(licenses, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [licenses.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToMany: LicenseEntitlements
  entitlements: many(licenseEntitlements),
}));
