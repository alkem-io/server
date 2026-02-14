import { relations } from 'drizzle-orm';
import { communityGuidelines } from './community.guidelines.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';

export const communityGuidelinesRelations = relations(
  communityGuidelines,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [communityGuidelines.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Profile
    profile: one(profiles, {
      fields: [communityGuidelines.profileId],
      references: [profiles.id],
    }),
  })
);
