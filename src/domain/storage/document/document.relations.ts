import { relations } from 'drizzle-orm';
import { documents } from './document.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { storageBuckets } from '@domain/storage/storage-bucket/storage.bucket.schema';
import { tagsets } from '@domain/common/tagset/tagset.schema';

export const documentsRelations = relations(documents, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [documents.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Tagset
  tagset: one(tagsets, {
    fields: [documents.tagsetId],
    references: [tagsets.id],
  }),

  // ManyToOne: StorageBucket
  storageBucket: one(storageBuckets, {
    fields: [documents.storageBucketId],
    references: [storageBuckets.id],
  }),
}));
