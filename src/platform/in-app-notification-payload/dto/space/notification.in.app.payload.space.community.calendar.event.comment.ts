import { Field, ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCommunityCalendarEventComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunityCalendarEventComment extends InAppNotificationPayloadSpaceBase {
  declare type: NotificationEventPayload.SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT;
  calendarEventID!: string;

  @Field(() => String, {
    description: 'Preview text of the comment',
  })
  commentText!: string;

  messageID!: string;
  roomID!: string;
}
