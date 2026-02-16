import { relations } from 'drizzle-orm';
import { references } from './reference.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';

export const referencesRelations = relations(references, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [references.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // ManyToOne: Profile
  profile: one(profiles, {
    fields: [references.profileId],
    references: [profiles.id],
  }),
}));
