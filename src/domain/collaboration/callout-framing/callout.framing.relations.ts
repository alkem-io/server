import { relations } from 'drizzle-orm';
import { calloutFramings } from './callout.framing.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { links } from '@domain/collaboration/link/link.schema';
import { whiteboards } from '@domain/common/whiteboard/whiteboard.schema';
import { memos } from '@domain/common/memo/memo.schema';
import { mediaGalleries } from '@domain/common/media-gallery/media.gallery.schema';

export const calloutFramingsRelations = relations(
  calloutFramings,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [calloutFramings.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Profile
    profile: one(profiles, {
      fields: [calloutFramings.profileId],
      references: [profiles.id],
    }),

    // OneToOne with @JoinColumn: Link
    link: one(links, {
      fields: [calloutFramings.linkId],
      references: [links.id],
    }),

    // OneToOne with @JoinColumn: Whiteboard
    whiteboard: one(whiteboards, {
      fields: [calloutFramings.whiteboardId],
      references: [whiteboards.id],
    }),

    // OneToOne with @JoinColumn: Memo
    memo: one(memos, {
      fields: [calloutFramings.memoId],
      references: [memos.id],
    }),

    // OneToOne with @JoinColumn: MediaGallery
    mediaGallery: one(mediaGalleries, {
      fields: [calloutFramings.mediaGalleryId],
      references: [mediaGalleries.id],
    }),

    // OneToOne inverse: Callout (no FK column here)
    callout: one(callouts),
  })
);
