import { relations } from 'drizzle-orm';
import { applications } from './application.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { users } from '@domain/community/user/user.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';

export const applicationsRelations = relations(applications, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [applications.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne: User
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),

  // ManyToOne: RoleSet
  roleSet: one(roleSets, {
    fields: [applications.roleSetId],
    references: [roleSets.id],
  }),
}));
