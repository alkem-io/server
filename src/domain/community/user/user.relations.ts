import { relations } from 'drizzle-orm';
import { users } from './user.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { userSettings } from '@domain/community/user-settings/user.settings.schema';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';
import { applications } from '@domain/access/application/application.schema';

export const usersRelations = relations(users, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns via contributorColumns)
  authorization: one(authorizationPolicies, {
    fields: [users.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne: profile (from nameableColumns via contributorColumns)
  profile: one(profiles, {
    fields: [users.profileId],
    references: [profiles.id],
  }),

  // OneToOne: agent (from contributorColumns)
  agent: one(agents, {
    fields: [users.agentId],
    references: [agents.id],
  }),

  // OneToOne with @JoinColumn: UserSettings
  settings: one(userSettings, {
    fields: [users.settingsId],
    references: [userSettings.id],
  }),

  // OneToOne with @JoinColumn: StorageAggregator
  storageAggregator: one(storageAggregators, {
    fields: [users.storageAggregatorId],
    references: [storageAggregators.id],
  }),

  // OneToMany: applications
  applications: many(applications),
}));
