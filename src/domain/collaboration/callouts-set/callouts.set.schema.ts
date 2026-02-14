import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const calloutsSets = pgTable('callouts_set', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }).notNull(),

  // OneToOne with @JoinColumn: TagsetTemplateSet
  tagsetTemplateSetId: uuid('tagsetTemplateSetId'),
});
