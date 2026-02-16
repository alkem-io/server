import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { UUID_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const communications = pgTable('communication', {
  ...authorizableColumns,

  spaceID: varchar('spaceID', { length: UUID_LENGTH }).notNull(),
  displayName: varchar('displayName', { length: 255 }).notNull(),

  // OneToOne with @JoinColumn: Room (updates)
  updatesId: uuid('updatesId'),
});
