import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const links = pgTable('link', {
  ...authorizableColumns,

  uri: text('uri').notNull(),

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),
});
