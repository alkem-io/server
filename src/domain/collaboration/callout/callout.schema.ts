import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const callouts = pgTable('callout', {
  ...authorizableColumns,

  nameID: varchar('nameID', { length: NAMEID_MAX_LENGTH_SCHEMA }).notNull(),
  isTemplate: boolean('isTemplate').notNull().default(false),
  createdBy: uuid('createdBy'),
  settings: jsonb('settings').notNull(),
  sortOrder: integer('sortOrder').notNull(),
  publishedBy: uuid('publishedBy'),
  publishedDate: timestamp('publishedDate', { mode: 'date' }),

  // OneToOne with @JoinColumn: CalloutFraming
  framingId: uuid('framingId'),

  // OneToOne with @JoinColumn: Classification
  classificationId: uuid('classificationId'),

  // OneToOne with @JoinColumn: CalloutContributionDefaults
  contributionDefaultsId: uuid('contributionDefaultsId'),

  // OneToOne with @JoinColumn: Room (comments)
  commentsId: uuid('commentsId'),

  // ManyToOne: CalloutsSet
  calloutsSetId: uuid('calloutsSetId'),
});
