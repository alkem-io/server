import { relations } from 'drizzle-orm';
import { innovationHubs } from './innovation.hub.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { accounts } from '@domain/space/account/account.schema';

export const innovationHubsRelations = relations(
  innovationHubs,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns via nameableColumns)
    authorization: one(authorizationPolicies, {
      fields: [innovationHubs.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne: profile (from nameableColumns)
    profile: one(profiles, {
      fields: [innovationHubs.profileId],
      references: [profiles.id],
    }),

    // ManyToOne: Account
    account: one(accounts, {
      fields: [innovationHubs.accountId],
      references: [accounts.id],
    }),
  })
);
