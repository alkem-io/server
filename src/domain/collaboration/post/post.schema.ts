import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { nameableColumns } from '@config/drizzle/base.columns';

export const posts = pgTable('post', {
  ...nameableColumns,

  createdBy: uuid('createdBy').notNull(),

  // OneToOne with @JoinColumn: Room (comments)
  commentsId: uuid('commentsId'),
});
