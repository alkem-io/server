import { relations } from 'drizzle-orm';
import { innovationPacks } from './innovation.pack.schema';
import { accounts } from '@domain/space/account/account.schema';
import { templatesSets } from '@domain/template/templates-set/templates.set.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';

export const innovationPacksRelations = relations(
  innovationPacks,
  ({ one }) => ({
    account: one(accounts, {
      fields: [innovationPacks.accountId],
      references: [accounts.id],
    }),
    templatesSet: one(templatesSets, {
      fields: [innovationPacks.templatesSetId],
      references: [templatesSets.id],
    }),
    profile: one(profiles, {
      fields: [innovationPacks.profileId],
      references: [profiles.id],
    }),
    authorization: one(authorizationPolicies, {
      fields: [innovationPacks.authorizationId],
      references: [authorizationPolicies.id],
    }),
  })
);
