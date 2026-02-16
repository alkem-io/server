import { relations } from 'drizzle-orm';
import { innovationFlows } from './innovation.flow.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { innovationFlowStates } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.schema';
import { tagsetTemplates } from '@domain/common/tagset-template/tagset.template.schema';

export const innovationFlowsRelations = relations(
  innovationFlows,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [innovationFlows.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Profile
    profile: one(profiles, {
      fields: [innovationFlows.profileId],
      references: [profiles.id],
    }),

    // OneToOne with @JoinColumn: TagsetTemplate (flowStatesTagsetTemplate)
    flowStatesTagsetTemplate: one(tagsetTemplates, {
      fields: [innovationFlows.flowStatesTagsetTemplateId],
      references: [tagsetTemplates.id],
    }),

    // OneToMany: states
    states: many(innovationFlowStates),
  })
);
