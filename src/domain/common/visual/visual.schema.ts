import { pgTable, varchar, uuid, integer, decimal, index } from 'drizzle-orm/pg-core';
import { ALT_TEXT_LENGTH, URI_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const visuals = pgTable(
  'visual',
  {
    ...authorizableColumns,

    name: varchar('name', { length: 255 }).notNull(),
    uri: varchar('uri', { length: URI_LENGTH }).notNull(),
    minWidth: integer('minWidth').notNull(),
    maxWidth: integer('maxWidth').notNull(),
    minHeight: integer('minHeight').notNull(),
    maxHeight: integer('maxHeight').notNull(),
    aspectRatio: decimal('aspectRatio', { precision: 3, scale: 1 }).notNull(),
    allowedTypes: simpleArray('allowedTypes').notNull(),
    alternativeText: varchar('alternativeText', { length: ALT_TEXT_LENGTH }),
    sortOrder: integer('sortOrder'),

    // ManyToOne: Profile
    profileId: uuid('profileId'),

    // ManyToOne: MediaGallery
    mediaGalleryId: uuid('mediaGalleryId'),
  },
  (table) => [index('IDX_visual_profileId').on(table.profileId)]
);
