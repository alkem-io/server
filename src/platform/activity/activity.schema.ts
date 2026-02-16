import { pgTable, varchar, uuid, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import {
  MESSAGEID_LENGTH,
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';

export const activities = pgTable(
  'activity',
  {
    ...baseColumns,
    rowId: integer('rowId').generatedAlwaysAsIdentity(),
    triggeredBy: uuid('triggeredBy').notNull(),
    resourceID: uuid('resourceID').notNull(),
    parentID: uuid('parentID'),
    collaborationID: uuid('collaborationID').notNull(),
    messageID: varchar('messageID', { length: MESSAGEID_LENGTH }),
    visibility: boolean('visibility').notNull(),
    description: varchar('description', { length: MID_TEXT_LENGTH }),
    type: varchar('type', { length: SMALL_TEXT_LENGTH }).notNull(),
  },
  table => [uniqueIndex('IDX_activity_rowId').on(table.rowId)]
);
