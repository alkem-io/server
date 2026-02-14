import { pgTable, boolean, varchar, uuid } from 'drizzle-orm/pg-core';
import { nameableColumns } from '@config/drizzle/base.columns';

export const innovationPacks = pgTable('innovation_pack', {
  ...nameableColumns,
  accountId: uuid('accountId'),
  templatesSetId: uuid('templatesSetId'),
  listedInStore: boolean('listedInStore').notNull(),
  searchVisibility: varchar('searchVisibility', { length: 36 })
    .notNull()
    .default('account'),
});
