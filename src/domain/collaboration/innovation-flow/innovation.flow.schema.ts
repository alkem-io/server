import { pgTable, uuid, jsonb } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const innovationFlows = pgTable('innovation_flow', {
  ...authorizableColumns,

  currentStateID: uuid('currentStateID'),
  settings: jsonb('settings').notNull(),

  // OneToOne with @JoinColumn: Profile
  profileId: uuid('profileId'),

  // OneToOne with @JoinColumn: TagsetTemplate (flowStatesTagsetTemplate)
  flowStatesTagsetTemplateId: uuid('flowStatesTagsetTemplateId'),
});
