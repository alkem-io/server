import { relations } from 'drizzle-orm';
import { invitations } from './invitation.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';

export const invitationsRelations = relations(invitations, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [invitations.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne: RoleSet
  roleSet: one(roleSets, {
    fields: [invitations.roleSetId],
    references: [roleSets.id],
  }),
}));
