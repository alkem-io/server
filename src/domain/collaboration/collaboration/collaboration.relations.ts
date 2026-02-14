import { relations } from 'drizzle-orm';
import { collaborations } from './collaboration.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { calloutsSets } from '@domain/collaboration/callouts-set/callouts.set.schema';
import { timelines } from '@domain/timeline/timeline/timeline.schema';
import { innovationFlows } from '@domain/collaboration/innovation-flow/innovation.flow.schema';
import { licenses } from '@domain/common/license/license.schema';
import { spaces } from '@domain/space/space/space.schema';

export const collaborationsRelations = relations(
  collaborations,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [collaborations.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: CalloutsSet
    calloutsSet: one(calloutsSets, {
      fields: [collaborations.calloutsSetId],
      references: [calloutsSets.id],
    }),

    // OneToOne with @JoinColumn: Timeline
    timeline: one(timelines, {
      fields: [collaborations.timelineId],
      references: [timelines.id],
    }),

    // OneToOne with @JoinColumn: InnovationFlow
    innovationFlow: one(innovationFlows, {
      fields: [collaborations.innovationFlowId],
      references: [innovationFlows.id],
    }),

    // OneToOne with @JoinColumn: License
    license: one(licenses, {
      fields: [collaborations.licenseId],
      references: [licenses.id],
    }),

    // OneToOne inverse: Space (no FK column here)
    space: one(spaces),
  })
);
