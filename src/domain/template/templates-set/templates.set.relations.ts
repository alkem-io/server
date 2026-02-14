import { relations } from 'drizzle-orm';
import { templatesSets } from './templates.set.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { templates } from '@domain/template/template/template.schema';

export const templatesSetsRelations = relations(
  templatesSets,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [templatesSets.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToMany: templates
    templates: many(templates),
  })
);
