import { pgTable, varchar, integer } from 'drizzle-orm/pg-core';
import { MID_TEXT_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const nvps = pgTable('nvp', {
  ...baseColumns,

  name: varchar('name', { length: MID_TEXT_LENGTH }).notNull(),
  value: varchar('value', { length: MID_TEXT_LENGTH }).notNull(),
  sortOrder: integer('sortOrder').notNull(),
});
