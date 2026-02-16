import { relations } from 'drizzle-orm';
import { calendarEvents } from './event.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { profiles } from '@domain/common/profile/profile.schema';
import { rooms } from '@domain/communication/room/room.schema';
import { calendars } from '@domain/timeline/calendar/calendar.schema';

export const calendarEventsRelations = relations(
  calendarEvents,
  ({ one }) => ({
    // OneToOne: authorization (from authorizableColumns via nameableColumns)
    authorization: one(authorizationPolicies, {
      fields: [calendarEvents.authorizationId],
      references: [authorizationPolicies.id],
    }),

    // OneToOne: profile (from nameableColumns)
    profile: one(profiles, {
      fields: [calendarEvents.profileId],
      references: [profiles.id],
    }),

    // OneToOne with @JoinColumn: Room (comments)
    comments: one(rooms, {
      fields: [calendarEvents.commentsId],
      references: [rooms.id],
    }),

    // ManyToOne: Calendar
    calendar: one(calendars, {
      fields: [calendarEvents.calendarId],
      references: [calendars.id],
    }),
  })
);
