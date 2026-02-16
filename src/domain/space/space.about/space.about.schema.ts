import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const spaceAbouts = pgTable('space_about', {
  ...authorizableColumns,

  why: text('why'),
  who: text('who'),

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),

  // OneToOne with @JoinColumn: CommunityGuidelines
  guidelinesId: uuid('guidelinesId'),
});
