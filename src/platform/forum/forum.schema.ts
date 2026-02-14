import { pgTable } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const forums = pgTable('forum', {
  ...authorizableColumns,
  discussionCategories: simpleArray('discussionCategories').notNull(),
});
