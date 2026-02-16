import { relations } from 'drizzle-orm';
import { virtualContributors } from './virtual.contributor.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { accounts } from '@domain/space/account/account.schema';

export const virtualContributorsRelations = relations(
  virtualContributors,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns via contributorColumns)
    authorization: one(authorizationPolicies, {
      fields: [virtualContributors.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne: profile (from nameableColumns via contributorColumns)
    profile: one(profiles, {
      fields: [virtualContributors.profileId],
      references: [profiles.id],
    }),

    // OneToOne: agent (from contributorColumns)
    agent: one(agents, {
      fields: [virtualContributors.agentId],
      references: [agents.id],
    }),

    // ManyToOne: Account
    account: one(accounts, {
      fields: [virtualContributors.accountId],
      references: [accounts.id],
    }),
  })
);
