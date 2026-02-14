import { pgTable, uuid, text, jsonb, integer } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const innovationFlowStates = pgTable('innovation_flow_state', {
  ...authorizableColumns,

  displayName: text('displayName').notNull(),
  description: text('description'),
  settings: jsonb('settings').notNull(),
  sortOrder: integer('sortOrder').notNull(),

  // ManyToOne: InnovationFlow
  innovationFlowId: uuid('innovationFlowId'),

  // ManyToOne: Template (defaultCalloutTemplate)
  defaultCalloutTemplateId: uuid('defaultCalloutTemplateId'),
});
