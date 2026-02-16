import { pgTable, varchar, uuid } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const tagsetTemplates = pgTable('tagset_template', {
  ...baseColumns,

  name: varchar('name', { length: SMALL_TEXT_LENGTH }).notNull(),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  allowedValues: simpleArray('allowedValues').notNull(),
  defaultSelectedValue: varchar('defaultSelectedValue', { length: 255 }),

  // ManyToOne: TagsetTemplateSet
  tagsetTemplateSetId: uuid('tagsetTemplateSetId'),
});
