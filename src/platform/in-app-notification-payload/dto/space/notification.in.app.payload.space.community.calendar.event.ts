import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEvent', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEvent extends InAppNotificationPayloadSpace {
  calendarEventID!: string;
}
