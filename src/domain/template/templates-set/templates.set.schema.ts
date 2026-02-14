import { pgTable } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const templatesSets = pgTable('templates_set', {
  ...authorizableColumns,
});
