import { pgTable } from 'drizzle-orm/pg-core';
import { baseColumns } from '@config/drizzle/base.columns';

export const tagsetTemplateSets = pgTable('tagset_template_set', {
  ...baseColumns,
});
