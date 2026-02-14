import { relations } from 'drizzle-orm';
import { calloutsSets } from './callouts.set.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { callouts } from '@domain/collaboration/callout/callout.schema';
import { collaborations } from '@domain/collaboration/collaboration/collaboration.schema';
import { tagsetTemplateSets } from '@domain/common/tagset-template-set/tagset.template.set.schema';

export const calloutsSetsRelations = relations(
  calloutsSets,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [calloutsSets.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: TagsetTemplateSet
    tagsetTemplateSet: one(tagsetTemplateSets, {
      fields: [calloutsSets.tagsetTemplateSetId],
      references: [tagsetTemplateSets.id],
    }),

    // OneToOne inverse: Collaboration (no FK column here)
    collaboration: one(collaborations),

    // OneToMany: callouts
    callouts: many(callouts),
  })
);
