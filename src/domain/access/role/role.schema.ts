import { pgTable, uuid, varchar, boolean, jsonb } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const roles = pgTable('role', {
  ...baseColumns,

  name: varchar('name', { length: ENUM_LENGTH }).notNull(),
  credential: jsonb('credential').notNull(),
  parentCredentials: jsonb('parentCredentials').notNull(),
  requiresEntryRole: boolean('requiresEntryRole').notNull(),
  requiresSameRoleInParentRoleSet: boolean('requiresSameRoleInParentRoleSet').notNull(),
  userPolicy: jsonb('userPolicy').notNull(),
  organizationPolicy: jsonb('organizationPolicy').notNull(),
  virtualContributorPolicy: jsonb('virtualContributorPolicy').notNull(),

  // ManyToOne: RoleSet
  roleSetId: uuid('roleSetId'),
});
