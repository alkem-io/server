import { relations } from 'drizzle-orm';
import { templatesManagers } from './templates.manager.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { templatesSets } from '@domain/template/templates-set/templates.set.schema';
import { templateDefaults } from '@domain/template/template-default/template.default.schema';

export const templatesManagersRelations = relations(
  templatesManagers,
  ({ one, many }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [templatesManagers.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: TemplatesSet
    templatesSet: one(templatesSets, {
      fields: [templatesManagers.templatesSetId],
      references: [templatesSets.id],
    }),

    // OneToMany: templateDefaults
    templateDefaults: many(templateDefaults),
  })
);
