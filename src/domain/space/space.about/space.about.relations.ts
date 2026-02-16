import { relations } from 'drizzle-orm';
import { spaceAbouts } from './space.about.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { communityGuidelines } from '@domain/community/community-guidelines/community.guidelines.schema';

export const spaceAboutsRelations = relations(spaceAbouts, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [spaceAbouts.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Profile
  profile: one(profiles, {
    fields: [spaceAbouts.profileId],
    references: [profiles.id],
  }),

  // OneToOne with @JoinColumn: CommunityGuidelines
  guidelines: one(communityGuidelines, {
    fields: [spaceAbouts.guidelinesId],
    references: [communityGuidelines.id],
  }),
}));
