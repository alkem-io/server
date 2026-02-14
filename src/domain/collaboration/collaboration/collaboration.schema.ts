import { pgTable, uuid, boolean } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const collaborations = pgTable('collaboration', {
  ...authorizableColumns,

  isTemplate: boolean('isTemplate').notNull().default(false),

  // OneToOne with @JoinColumn: CalloutsSet
  calloutsSetId: uuid('calloutsSetId'),

  // OneToOne with @JoinColumn: Timeline
  timelineId: uuid('timelineId'),

  // OneToOne with @JoinColumn: InnovationFlow
  innovationFlowId: uuid('innovationFlowId'),

  // OneToOne with @JoinColumn: License
  licenseId: uuid('licenseId'),
});
