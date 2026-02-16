import { pgTable, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, SUBDOMAIN_LENGTH } from '@common/constants';
import { nameableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const innovationHubs = pgTable('innovation_hub', {
  ...nameableColumns,

  subdomain: varchar('subdomain', { length: SUBDOMAIN_LENGTH }).notNull().unique(),
  type: varchar('type', { length: 255 }).notNull(),
  spaceVisibilityFilter: varchar('spaceVisibilityFilter', { length: 255 }),
  spaceListFilter: simpleArray('spaceListFilter'),
  listedInStore: boolean('listedInStore').notNull(),
  searchVisibility: varchar('searchVisibility', { length: ENUM_LENGTH }).notNull().default('account'),

  // ManyToOne: Account
  accountId: uuid('accountId'),
});
