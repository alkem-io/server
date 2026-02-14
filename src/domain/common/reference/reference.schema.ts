import { pgTable, varchar, text, uuid, index } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const references = pgTable(
  'reference',
  {
    ...authorizableColumns,

    name: varchar('name', { length: 255 }).notNull(),
    uri: text('uri').notNull(),
    description: text('description'),

    // ManyToOne: Profile
    profileId: uuid('profileId'),
  },
  (table) => [index('IDX_reference_profileId').on(table.profileId)]
);
