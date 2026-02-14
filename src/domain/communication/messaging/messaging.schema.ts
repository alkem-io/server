import { pgTable } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const messagings = pgTable('messaging', {
  ...authorizableColumns,
});
