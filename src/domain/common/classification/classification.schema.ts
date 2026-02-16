import { pgTable } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const classifications = pgTable('classification', {
  ...authorizableColumns,
});
