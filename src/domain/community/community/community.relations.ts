import { relations } from 'drizzle-orm';
import { communities } from './community.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { communications } from '@domain/communication/communication/communication.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';
import { userGroups } from '@domain/community/user-group/user-group.schema';

export const communitiesRelations = relations(
  communities,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [communities.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Communication
    communication: one(communications, {
      fields: [communities.communicationId],
      references: [communications.id],
    }),

    // OneToOne with @JoinColumn: RoleSet
    roleSet: one(roleSets, {
      fields: [communities.roleSetId],
      references: [roleSets.id],
    }),

    // OneToMany: groups
    groups: many(userGroups),
  })
);
