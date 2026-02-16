import { pgTable, uuid, varchar, text } from 'drizzle-orm/pg-core';
import { nameableColumns } from '@config/drizzle/base.columns';

export const templates = pgTable('template', {
  ...nameableColumns,

  type: varchar('type', { length: 128 }).notNull(),
  postDefaultDescription: text('postDefaultDescription'),

  // OneToOne with @JoinColumn: Profile (overrides the one from nameableColumns)
  // profileId is already in nameableColumns

  // OneToOne with @JoinColumn: CommunityGuidelines
  communityGuidelinesId: uuid('communityGuidelinesId'),

  // OneToOne with @JoinColumn: Callout
  calloutId: uuid('calloutId'),

  // OneToOne with @JoinColumn: Whiteboard
  whiteboardId: uuid('whiteboardId'),

  // OneToOne with @JoinColumn: TemplateContentSpace
  contentSpaceId: uuid('contentSpaceId'),

  // ManyToOne: TemplatesSet
  templatesSetId: uuid('templatesSetId'),
});
