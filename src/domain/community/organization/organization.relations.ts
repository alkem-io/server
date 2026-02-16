import { relations } from 'drizzle-orm';
import { organizations } from './organization.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { agents } from '@domain/agent/agent/agent.schema';
import { organizationVerifications } from '@domain/community/organization-verification/organization.verification.schema';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';
import { userGroups } from '@domain/community/user-group/user-group.schema';

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns via contributorColumns)
    authorization: one(authorizationPolicies, {
      fields: [organizations.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne: profile (from nameableColumns via contributorColumns)
    profile: one(profiles, {
      fields: [organizations.profileId],
      references: [profiles.id],
    }),

    // OneToOne: agent (from contributorColumns)
    agent: one(agents, {
      fields: [organizations.agentId],
      references: [agents.id],
    }),

    // OneToOne with @JoinColumn: OrganizationVerification
    verification: one(organizationVerifications, {
      fields: [organizations.verificationId],
      references: [organizationVerifications.id],
    }),

    // OneToOne with @JoinColumn: StorageAggregator
    storageAggregator: one(storageAggregators, {
      fields: [organizations.storageAggregatorId],
      references: [storageAggregators.id],
    }),

    // OneToOne with @JoinColumn: RoleSet
    roleSet: one(roleSets, {
      fields: [organizations.roleSetId],
      references: [roleSets.id],
    }),

    // OneToMany: groups
    groups: many(userGroups),
  })
);
