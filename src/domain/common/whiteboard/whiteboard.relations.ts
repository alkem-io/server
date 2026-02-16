import { relations } from 'drizzle-orm';
import { whiteboards } from './whiteboard.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';

export const whiteboardsRelations = relations(whiteboards, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns via nameableColumns)
  authorization: one(authorizationPolicies, {
    fields: [whiteboards.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne: profile (from nameableColumns)
  profile: one(profiles, {
    fields: [whiteboards.profileId],
    references: [profiles.id],
  }),
}));
