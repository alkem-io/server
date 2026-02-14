import { pgTable, jsonb } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const userSettings = pgTable('user_settings', {
  ...authorizableColumns,

  communication: jsonb('communication').notNull(),
  privacy: jsonb('privacy').notNull(),
  notification: jsonb('notification').notNull(),
  homeSpace: jsonb('homeSpace').notNull(),
});
