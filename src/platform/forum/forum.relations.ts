import { relations } from 'drizzle-orm';
import { forums } from './forum.schema';
import { discussions } from '@platform/forum-discussion/discussion.schema';

export const forumsRelations = relations(forums, ({ many }) => ({
  discussions: many(discussions),
}));
