import { relations } from 'drizzle-orm';
import { calendars } from './calendar.schema';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { calendarEvents } from '@domain/timeline/event/event.schema';

export const calendarsRelations = relations(calendars, ({ one, many }) => ({
  // OneToOne: authorization (from authorizableColumns)
  authorization: one(authorizationPolicies, {
    fields: [calendars.authorizationId],
    references: [authorizationPolicies.id],
  }),

  // OneToMany: events
  events: many(calendarEvents),
}));
