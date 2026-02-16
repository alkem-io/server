import { relations } from 'drizzle-orm';
import { storageBuckets } from './storage.bucket.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { documents } from '@domain/storage/document/document.schema';
import { storageAggregators } from '@domain/storage/storage-aggregator/storage.aggregator.schema';

export const storageBucketsRelations = relations(
  storageBuckets,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [storageBuckets.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // ManyToOne: StorageAggregator
    storageAggregator: one(storageAggregators, {
      fields: [storageBuckets.storageAggregatorId],
      references: [storageAggregators.id],
    }),

    // OneToMany: documents
    documents: many(documents),
  })
);
