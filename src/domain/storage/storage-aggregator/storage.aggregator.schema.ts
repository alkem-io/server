import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const storageAggregators = pgTable('storage_aggregator', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }),

  // ManyToOne: self-referencing parentStorageAggregator
  parentStorageAggregatorId: uuid('parentStorageAggregatorId'),

  // OneToOne with @JoinColumn: StorageBucket (directStorage)
  directStorageId: uuid('directStorageId'),
});
