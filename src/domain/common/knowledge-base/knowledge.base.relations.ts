import { relations } from 'drizzle-orm';
import { knowledgeBases } from './knowledge.base.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { calloutsSets } from '@domain/collaboration/callouts-set/callouts.set.schema';

export const knowledgeBasesRelations = relations(
  knowledgeBases,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [knowledgeBases.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Profile
    profile: one(profiles, {
      fields: [knowledgeBases.profileId],
      references: [profiles.id],
    }),

    // OneToOne with @JoinColumn: CalloutsSet
    calloutsSet: one(calloutsSets, {
      fields: [knowledgeBases.calloutsSetId],
      references: [calloutsSets.id],
    }),
  })
);
