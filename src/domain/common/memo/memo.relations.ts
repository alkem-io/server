import { relations } from 'drizzle-orm';
import { memos } from './memo.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';

export const memosRelations = relations(memos, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns via nameableColumns)
  authorization: one(authorizationPolicies, {
    fields: [memos.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne: profile (from nameableColumns)
  profile: one(profiles, {
    fields: [memos.profileId],
    references: [profiles.id],
  }),
}));
