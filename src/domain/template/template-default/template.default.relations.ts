import { relations } from 'drizzle-orm';
import { templateDefaults } from './template.default.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { templates } from '@domain/template/template/template.schema';
import { templatesManagers } from '@domain/template/templates-manager/templates.manager.schema';

export const templateDefaultsRelations = relations(
  templateDefaults,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns)
    authorization: one(authorizationPolicies, {
      fields: [templateDefaults.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne with @JoinColumn: Template
    template: one(templates, {
      fields: [templateDefaults.templateId],
      references: [templates.id],
    }),

    // ManyToOne: TemplatesManager
    templatesManager: one(templatesManagers, {
      fields: [templateDefaults.templatesManagerId],
      references: [templatesManagers.id],
    }),
  })
);
