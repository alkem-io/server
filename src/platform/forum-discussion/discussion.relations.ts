import { relations } from 'drizzle-orm';
import { discussions } from './discussion.schema';
import { forums } from '@platform/forum/forum.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { rooms } from '@domain/communication/room/room.schema';

export const discussionsRelations = relations(discussions, ({ one }) => ({
  forum: one(forums, {
    fields: [discussions.forumId],
    references: [forums.id],
  }),
  profile: one(profiles, {
    fields: [discussions.profileId],
    references: [profiles.id],
  }),
  authorization: one(authorizationPolicies, {
    fields: [discussions.authorizationId],
    references: [authorizationPolicies.id],
  }),
  comments: one(rooms, {
    fields: [discussions.commentsId],
    references: [rooms.id],
  }),
}));
