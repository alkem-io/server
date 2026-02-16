import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const agents = pgTable('agent', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }),
});
