import { pgTable, uuid, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { nameableColumns } from '@config/drizzle/base.columns';

export const calendarEvents = pgTable('calendar_event', {
  ...nameableColumns,

  type: varchar('type', { length: ENUM_LENGTH }).notNull(),
  createdBy: uuid('createdBy').notNull(),
  startDate: timestamp('startDate', { mode: 'date' }).notNull(),
  wholeDay: boolean('wholeDay').notNull(),
  multipleDays: boolean('multipleDays').notNull(),
  durationMinutes: integer('durationMinutes').notNull(),
  durationDays: integer('durationDays'),
  visibleOnParentCalendar: boolean('visibleOnParentCalendar').notNull(),

  // OneToOne with @JoinColumn: Room (comments)
  commentsId: uuid('commentsId'),

  // ManyToOne: Calendar
  calendarId: uuid('calendarId'),
});
