import { pgTable, uuid, varchar, integer, boolean } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const documents = pgTable('document', {
  ...authorizableColumns,

  createdBy: uuid('createdBy'),
  displayName: varchar('displayName', { length: MID_TEXT_LENGTH }).notNull(),
  mimeType: varchar('mimeType', { length: ENUM_LENGTH }).notNull(),
  size: integer('size').notNull(),
  externalID: varchar('externalID', { length: SMALL_TEXT_LENGTH }).notNull(),
  temporaryLocation: boolean('temporaryLocation').notNull().default(false),

  // OneToOne with @JoinColumn: Tagset
  tagsetId: uuid('tagsetId'),

  // ManyToOne: StorageBucket
  storageBucketId: uuid('storageBucketId'),
});
