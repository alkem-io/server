import { pgTable, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const licenses = pgTable('license', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
});
