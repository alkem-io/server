import { pgTable, varchar, uuid, timestamp, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { ENUM_LENGTH } from '@common/constants';
import { baseColumns } from '@config/drizzle/base.columns';
import type { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

export const inAppNotifications = pgTable(
  'in_app_notification',
  {
    ...baseColumns,
    rowId: integer('rowId').generatedAlwaysAsIdentity(),
    type: varchar('type', { length: ENUM_LENGTH }).notNull(),
    state: varchar('state', { length: ENUM_LENGTH }).notNull(),
    category: varchar('category', { length: ENUM_LENGTH }).notNull(),
    triggeredAt: timestamp('triggeredAt', { mode: 'date' }).notNull(),
    triggeredByID: uuid('triggeredByID'),
    receiverID: uuid('receiverID').notNull(),
    payload: jsonb('payload').notNull().$type<IInAppNotificationPayload>(),

    // Core entity FK columns - nullable, only populated per notification type
    spaceID: uuid('spaceID'),
    organizationID: uuid('organizationID'),
    userID: uuid('userID'),
    applicationID: uuid('applicationID'),
    invitationID: uuid('invitationID'),
    calloutID: uuid('calloutID'),
    contributionID: uuid('contributionID'),
    roomID: uuid('roomID'),
    messageID: varchar('messageID', { length: 44 }),
    contributorOrganizationID: uuid('contributorOrganizationID'),
    contributorUserID: uuid('contributorUserID'),
    contributorVcID: uuid('contributorVcID'),
    calendarEventID: uuid('calendarEventID'),
  },
  table => [uniqueIndex('IDX_in_app_notification_rowId').on(table.rowId)]
);
