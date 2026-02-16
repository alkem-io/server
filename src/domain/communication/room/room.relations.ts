import { relations } from 'drizzle-orm';
import { rooms } from './room.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { posts } from '@domain/collaboration/post/post.schema';

export const roomsRelations = relations(rooms, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [rooms.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne inverse: Callout (no FK column here, FK is on callout side)
  callout: one(callouts),

  // OneToOne inverse: Post (no FK column here, FK is on post side)
  post: one(posts),
}));
