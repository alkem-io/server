import { pgTable, uuid, integer } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';
import { simpleArray } from '@config/drizzle/custom-types';

export const storageBuckets = pgTable('storage_bucket', {
  ...authorizableColumns,

  allowedMimeTypes: simpleArray('allowedMimeTypes').notNull(),
  maxFileSize: integer('maxFileSize').notNull(),

  // ManyToOne: StorageAggregator
  storageAggregatorId: uuid('storageAggregatorId'),
});
