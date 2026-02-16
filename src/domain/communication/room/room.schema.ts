import { pgTable, varchar, integer, jsonb } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const rooms = pgTable('room', {
  ...authorizableColumns,

  messagesCount: integer('messagesCount').notNull(),
  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  displayName: varchar('displayName', { length: 255 }).notNull(),
  vcInteractionsByThread: jsonb('vcInteractionsByThread').default({}),
});
