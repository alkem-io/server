import { relations } from 'drizzle-orm';
import { roles } from './role.schema';
import { roleSets } from '@domain/access/role-set/role.set.schema';

export const rolesRelations = relations(roles, ({ one }) => ({
  // ManyToOne: RoleSet
  roleSet: one(roleSets, {
    fields: [roles.roleSetId],
    references: [roleSets.id],
  }),
}));
