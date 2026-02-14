import { relations } from 'drizzle-orm';
import { userGroups } from './user-group.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { organizations } from '@domain/community/organization/organization.schema';
import { communities } from '@domain/community/community/community.schema';

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [userGroups.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Profile
  profile: one(profiles, {
    fields: [userGroups.profileId],
    references: [profiles.id],
  }),

  // ManyToOne: Organization
  organization: one(organizations, {
    fields: [userGroups.organizationId],
    references: [organizations.id],
  }),

  // ManyToOne: Community
  community: one(communities, {
    fields: [userGroups.communityId],
    references: [communities.id],
  }),
}));
