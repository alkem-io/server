import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { UUID_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const communities = pgTable('community', {
  ...authorizableColumns,

  parentID: varchar('parentID', { length: UUID_LENGTH }).notNull(),

  // OneToOne with @JoinColumn: Communication
  communicationId: uuid('communicationId'),

  // OneToOne with @JoinColumn: RoleSet
  roleSetId: uuid('roleSetId'),
});
