import { relations } from 'drizzle-orm';
import { storageAggregators } from './storage.aggregator.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { storageBuckets } from '@domain/storage/storage-bucket/storage.bucket.schema';

export const storageAggregatorsRelations = relations(
  storageAggregators,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [storageAggregators.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // ManyToOne: self-referencing parentStorageAggregator
    parentStorageAggregator: one(storageAggregators, {
      fields: [storageAggregators.parentStorageAggregatorId],
      references: [storageAggregators.id],
      relationName: 'parentChild',
    }),

    // OneToOne with @JoinColumn: StorageBucket (directStorage)
    directStorage: one(storageBuckets, {
      fields: [storageAggregators.directStorageId],
      references: [storageBuckets.id],
    }),
  })
);
