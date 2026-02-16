import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const licensingFrameworks = pgTable('licensing_framework', {
  ...authorizableColumns,
  licensePolicyId: uuid('licensePolicyId'),
});
