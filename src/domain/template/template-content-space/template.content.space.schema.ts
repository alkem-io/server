import { pgTable, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const templateContentSpaces = pgTable('template_content_space', {
  ...authorizableColumns,

  rowId: integer('rowId').generatedAlwaysAsIdentity().unique(),
  settings: jsonb('settings').notNull(),
  level: integer('level').notNull(),

  // ManyToOne: self-referencing parentSpace
  parentSpaceId: uuid('parentSpaceId'),

  // OneToOne with @JoinColumn: Collaboration
  collaborationId: uuid('collaborationId'),

  // OneToOne with @JoinColumn: SpaceAbout
  aboutId: uuid('aboutId'),
});
