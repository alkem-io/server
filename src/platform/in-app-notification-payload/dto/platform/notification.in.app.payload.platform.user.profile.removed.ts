import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadPlatformBase } from './notification.in.app.payload.platform.base';
@ObjectType('InAppNotificationPayloadPlatformUserProfileRemoved', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformUserProfileRemoved extends InAppNotificationPayloadPlatformBase {
  userDisplayName!: string;
  userEmail!: string;
  declare type: NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED;
}
