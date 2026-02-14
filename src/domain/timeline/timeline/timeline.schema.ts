import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { authorizableColumns } from '@config/drizzle/base.columns';

export const timelines = pgTable('timeline', {
  ...authorizableColumns,

  // OneToOne with @JoinColumn: Calendar
  calendarId: uuid('calendarId'),
});
