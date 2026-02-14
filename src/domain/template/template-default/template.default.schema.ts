import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const templateDefaults = pgTable('template_default', {
  ...authorizableColumns,

  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  allowedTemplateType: varchar('allowedTemplateType', { length: ENUM_LENGTH }).notNull(),

  // OneToOne with @JoinColumn: Template
  templateId: uuid('templateId'),

  // ManyToOne: TemplatesManager
  templatesManagerId: uuid('templatesManagerId'),
});
