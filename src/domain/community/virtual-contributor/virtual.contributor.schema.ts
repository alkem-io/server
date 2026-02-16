import { pgTable, uuid, varchar, integer, jsonb, boolean, text } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { contributorColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const virtualContributors = pgTable('virtual_contributor', {
  ...contributorColumns,

  rowId: integer('rowId').generatedAlwaysAsIdentity().unique(),
  settings: jsonb('settings').notNull(),
  platformSettings: jsonb('platformSettings').notNull(),
  aiPersonaID: uuid('aiPersonaID').notNull(),
  bodyOfKnowledgeID: varchar('bodyOfKnowledgeID', { length: SMALL_TEXT_LENGTH }),
  promptGraphDefinition: jsonb('promptGraphDefinition'),
  listedInStore: boolean('listedInStore').notNull(),
  searchVisibility: varchar('searchVisibility', { length: ENUM_LENGTH }).notNull(),
  dataAccessMode: varchar('dataAccessMode', { length: ENUM_LENGTH }).notNull(),
  interactionModes: simpleArray('interactionModes').notNull(),
  bodyOfKnowledgeType: varchar('bodyOfKnowledgeType', { length: ENUM_LENGTH }).notNull(),
  bodyOfKnowledgeDescription: text('bodyOfKnowledgeDescription'),

  // ManyToOne: Account
  accountId: uuid('accountId'),

  // OneToOne with @JoinColumn: KnowledgeBase
  knowledgeBaseId: uuid('knowledgeBaseId'),
});
