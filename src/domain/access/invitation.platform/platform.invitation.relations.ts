import { relations } from 'drizzle-orm';
import { platformInvitations } from './platform.invitation.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';

export const platformInvitationsRelations = relations(
  platformInvitations,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [platformInvitations.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // ManyToOne: RoleSet
    roleSet: one(roleSets, {
      fields: [platformInvitations.roleSetId],
      references: [roleSets.id],
    }),
  })
);
