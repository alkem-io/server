import { relations } from 'drizzle-orm';
import { licensePlans } from './license.plan.schema';
import { licensingFrameworks } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.schema';

export const licensePlansRelations = relations(licensePlans, ({ one }) => ({
  licensingFramework: one(licensingFrameworks, {
    fields: [licensePlans.licensingFrameworkId],
    references: [licensingFrameworks.id],
  }),
}));
