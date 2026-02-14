import { pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { nameableColumns } from '@config/drizzle/base.columns';

export const discussions = pgTable('discussion', {
  ...nameableColumns,
  category: text('category').notNull(),
  commentsId: uuid('commentsId'),
  createdBy: uuid('createdBy').notNull(),
  forumId: uuid('forumId'),
  privacy: varchar('privacy', { length: 255 }).notNull().default('authenticated'),
});
