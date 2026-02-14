import { relations } from 'drizzle-orm';
import { visuals } from './visual.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { mediaGalleries } from '@domain/common/media-gallery/media.gallery.schema';

export const visualsRelations = relations(visuals, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [visuals.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne: Profile
  profile: one(profiles, {
    fields: [visuals.profileId],
    references: [profiles.id],
  }),

  // ManyToOne: MediaGallery
  mediaGallery: one(mediaGalleries, {
    fields: [visuals.mediaGalleryId],
    references: [mediaGalleries.id],
  }),
}));
