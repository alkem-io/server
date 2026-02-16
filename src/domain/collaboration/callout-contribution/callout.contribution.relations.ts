import { relations } from 'drizzle-orm';
import { calloutContributions } from './callout.contribution.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { posts } from '@domain/collaboration/post/post.schema';
import { links } from '@domain/collaboration/link/link.schema';
import { whiteboards } from '@domain/common/whiteboard/whiteboard.schema';
import { memos } from '@domain/common/memo/memo.schema';

export const calloutContributionsRelations = relations(
  calloutContributions,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [calloutContributions.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Post
    post: one(posts, {
      fields: [calloutContributions.postId],
      references: [posts.id],
    }),

    // OneToOne with @JoinColumn: Link
    link: one(links, {
      fields: [calloutContributions.linkId],
      references: [links.id],
    }),

    // OneToOne with @JoinColumn: Whiteboard
    whiteboard: one(whiteboards, {
      fields: [calloutContributions.whiteboardId],
      references: [whiteboards.id],
    }),

    // OneToOne with @JoinColumn: Memo
    memo: one(memos, {
      fields: [calloutContributions.memoId],
      references: [memos.id],
    }),

    // ManyToOne: Callout
    callout: one(callouts, {
      fields: [calloutContributions.calloutId],
      references: [callouts.id],
    }),
  })
);
