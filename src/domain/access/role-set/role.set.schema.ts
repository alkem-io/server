import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const roleSets = pgTable('role_set', {
  ...authorizableColumns,

  entryRoleName: varchar('entryRoleName', { length: ENUM_LENGTH }).notNull(),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),

  // OneToOne with @JoinColumn: License
  licenseId: uuid('licenseId'),

  // OneToOne with @JoinColumn: Form (applicationForm)
  applicationFormId: uuid('applicationFormId'),

  // ManyToOne: self-referencing parentRoleSet
  parentRoleSetId: uuid('parentRoleSetId'),
});
