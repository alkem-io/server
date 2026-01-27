import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadPlatformBase } from './notification.in.app.payload.platform.base';

@ObjectType('InAppNotificationPayloadPlatformForumDiscussion', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformForumDiscussion extends InAppNotificationPayloadPlatformBase {
  discussion!: {
    id: string;
    displayName: string;
    url: string;
    description?: string;
    category?: string;
    roomID: string;
  };
  comment?: {
    id: string;
    message: string;
  };
  declare type: NotificationEventPayload.PLATFORM_FORUM_DISCUSSION;
}
