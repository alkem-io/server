import { pgTable, varchar, uuid, index } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const tagsets = pgTable(
  'tagset',
  {
    ...authorizableColumns,

    name: varchar('name', { length: 255 }).default('default').notNull(),
    type: varchar('type', { length: ENUM_LENGTH }).notNull(),
    tags: simpleArray('tags').notNull(),

    // ManyToOne: Profile
    profileId: uuid('profileId'),

    // ManyToOne: Classification
    classificationId: uuid('classificationId'),

    // ManyToOne: TagsetTemplate
    tagsetTemplateId: uuid('tagsetTemplateId'),
  },
  (table) => [index('IDX_tagset_profileId').on(table.profileId)]
);
