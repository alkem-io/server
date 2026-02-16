import { pgTable, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const calloutContributions = pgTable('callout_contribution', {
  ...authorizableColumns,

  createdBy: uuid('createdBy'),
  type: varchar('type', { length: ENUM_LENGTH }).notNull().default('post'),
  sortOrder: integer('sortOrder').notNull(),

  // OneToOne with @JoinColumn: Whiteboard
  whiteboardId: uuid('whiteboardId'),

  // OneToOne with @JoinColumn: Memo
  memoId: uuid('memoId'),

  // OneToOne with @JoinColumn: Post
  postId: uuid('postId'),

  // OneToOne with @JoinColumn: Link
  linkId: uuid('linkId'),

  // ManyToOne: Callout
  calloutId: uuid('calloutId'),
});
