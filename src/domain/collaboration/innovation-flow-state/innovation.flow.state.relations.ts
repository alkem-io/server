import { relations } from 'drizzle-orm';
import { innovationFlowStates } from './innovation.flow.state.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { innovationFlows } from '@domain/collaboration/innovation-flow/innovation.flow.schema';
import { templates } from '@domain/template/template/template.schema';

export const innovationFlowStatesRelations = relations(
  innovationFlowStates,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [innovationFlowStates.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // ManyToOne: InnovationFlow
    innovationFlow: one(innovationFlows, {
      fields: [innovationFlowStates.innovationFlowId],
      references: [innovationFlows.id],
    }),

    // ManyToOne: Template (defaultCalloutTemplate)
    defaultCalloutTemplate: one(templates, {
      fields: [innovationFlowStates.defaultCalloutTemplateId],
      references: [templates.id],
    }),
  })
);
