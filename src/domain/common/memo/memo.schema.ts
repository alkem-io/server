import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { nameableColumns } from '@config/drizzle/base.columns';

/**
 * Custom type for bytea columns storing binary content.
 */
const bytea = customType<{
  data: Buffer;
  driverData: Buffer;
}>({
  dataType() {
    return 'bytea';
  },
});

export const memos = pgTable('memo', {
  ...nameableColumns,

  content: bytea('content'),
  createdBy: uuid('createdBy'),
  contentUpdatePolicy: varchar('contentUpdatePolicy', {
    length: ENUM_LENGTH,
  }).notNull(),
});
