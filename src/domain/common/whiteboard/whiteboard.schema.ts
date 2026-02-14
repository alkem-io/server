import { pgTable, text, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { nameableColumns } from '@config/drizzle/base.columns';

export const whiteboards = pgTable('whiteboard', {
  ...nameableColumns,

  content: text('content').notNull(),
  createdBy: uuid('createdBy'),
  contentUpdatePolicy: varchar('contentUpdatePolicy', {
    length: ENUM_LENGTH,
  }).notNull(),
  previewSettings: jsonb('previewSettings').notNull(),
});
