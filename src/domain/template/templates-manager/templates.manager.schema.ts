import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const templatesManagers = pgTable('templates_manager', {
  ...authorizableColumns,

  // OneToOne with @JoinColumn: TemplatesSet
  templatesSetId: uuid('templatesSetId'),
});
