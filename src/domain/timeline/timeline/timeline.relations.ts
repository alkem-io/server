import { relations } from 'drizzle-orm';
import { timelines } from './timeline.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { calendars } from '@domain/timeline/calendar/calendar.schema';

export const timelinesRelations = relations(timelines, ({ one }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [timelines.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToOne with @JoinColumn: Calendar
  calendar: one(calendars, {
    fields: [timelines.calendarId],
    references: [calendars.id],
  }),
}));
