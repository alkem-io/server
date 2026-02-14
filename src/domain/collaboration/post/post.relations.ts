import { relations } from 'drizzle-orm';
import { posts } from './post.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { rooms } from '@domain/communication/room/room.schema';
import { calloutContributions } from '@domain/collaboration/callout-contribution/callout.contribution.schema';

export const postsRelations = relations(posts, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns via nameableColumns)
  authorization: one(authorizationPolicies, {
    fields: [posts.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne: profile (from nameableColumns)
  profile: one(profiles, {
    fields: [posts.profileId],
    references: [profiles.id],
  }),

  // OneToOne with @JoinColumn: Room (comments)
  comments: one(rooms, {
    fields: [posts.commentsId],
    references: [rooms.id],
  }),

  // OneToOne inverse: CalloutContribution (no FK column here)
  contribution: one(calloutContributions),
}));
