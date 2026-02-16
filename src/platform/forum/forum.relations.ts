import { relations } from 'drizzle-orm';
import { forums } from './forum.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { discussions } from '@platform/forum-discussion/discussion.schema';

export const forumsRelations = relations(forums, ({ one, many }) => ({
  authorization: one(authorizationPolicies, {
    fields: [forums.authorizationId],
    references: [authorizationPolicies.id],
  }),
  discussions: many(discussions),
}));
