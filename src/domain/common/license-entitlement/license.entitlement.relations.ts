import { relations } from 'drizzle-orm';
import { licenseEntitlements } from './license.entitlement.schema';
import { licenses } from '@domain/common/license/license.schema';

export const licenseEntitlementsRelations = relations(
  licenseEntitlements,
  ({ one }) => ({
    // ManyToOne: License
    license: one(licenses, {
      fields: [licenseEntitlements.licenseId],
      references: [licenses.id],
    }),
  })
);
