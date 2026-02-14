import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH, UUID_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const credentials = pgTable('credential', {
  ...baseColumns,

  resourceID: varchar('resourceID', { length: UUID_LENGTH }).notNull(),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  issuer: uuid('issuer'),
  expires: timestamp('expires', { mode: 'date' }),

  // ManyToOne: Agent
  agentId: uuid('agentId'),
});
