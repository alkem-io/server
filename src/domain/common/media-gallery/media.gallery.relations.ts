import { relations } from 'drizzle-orm';
import { mediaGalleries } from './media.gallery.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { visuals } from '@domain/common/visual/visual.schema';
import { storageBuckets } from '@domain/storage/storage-bucket/storage.bucket.schema';

export const mediaGalleriesRelations = relations(
  mediaGalleries,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [mediaGalleries.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: StorageBucket
    storageBucket: one(storageBuckets, {
      fields: [mediaGalleries.storageBucketId],
      references: [storageBuckets.id],
    }),

    // OneToMany: Visuals
    visuals: many(visuals),
  })
);
