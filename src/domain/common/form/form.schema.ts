import { pgTable, text } from 'drizzle-orm/pg-core';
import { baseColumns } from '@config/drizzle/base.columns';

export const forms = pgTable('form', {
  ...baseColumns,

  questions: text('questions').notNull(),
  description: text('description').notNull(),
});
