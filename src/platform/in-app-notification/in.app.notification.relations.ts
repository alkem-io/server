import { relations } from 'drizzle-orm';
import { inAppNotifications } from './in.app.notification.schema';

export const inAppNotificationsRelations = relations(
  inAppNotifications,
  () => ({
    // Relations to external entities (User, Space, Organization, Application,
    // Invitation, Callout, CalloutContribution, Room, VirtualContributor,
    // CalendarEvent) will be defined when those schemas are migrated.
    // The FK uuid columns are already present in the table definition.
  })
);
