import { relations } from 'drizzle-orm';
import { userSettings } from './user.settings.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [userSettings.authorizationId],
    references: [authorizationPolicies.id],
  }),
}));
