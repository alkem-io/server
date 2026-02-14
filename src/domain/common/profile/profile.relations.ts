import { relations } from 'drizzle-orm';
import { profiles } from './profile.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { locations } from '@domain/common/location/location.schema';
import { references } from '@domain/common/reference/reference.schema';
import { tagsets } from '@domain/common/tagset/tagset.schema';
import { visuals } from '@domain/common/visual/visual.schema';
import { storageBuckets } from '@domain/storage/storage-bucket/storage.bucket.schema';

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [profiles.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Location
  location: one(locations, {
    fields: [profiles.locationId],
    references: [locations.id],
  }),

  // OneToOne with @JoinColumn: StorageBucket
  storageBucket: one(storageBuckets, {
    fields: [profiles.storageBucketId],
    references: [storageBuckets.id],
  }),

  // OneToMany: references
  references: many(references),

  // OneToMany: tagsets
  tagsets: many(tagsets),

  // OneToMany: visuals
  visuals: many(visuals),
}));
