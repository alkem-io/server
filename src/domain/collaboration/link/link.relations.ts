import { relations } from 'drizzle-orm';
import { links } from './link.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';

export const linksRelations = relations(links, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [links.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Profile
  profile: one(profiles, {
    fields: [links.profileId],
    references: [profiles.id],
  }),
}));
