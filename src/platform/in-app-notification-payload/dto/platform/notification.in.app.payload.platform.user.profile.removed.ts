import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatform } from './notification.in.app.payload.platform.base';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
@ObjectType('InAppNotificationPayloadPlatformUserProfileRemoved', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformUserProfileRemoved extends InAppNotificationPayloadPlatform {
  userDisplayName!: string;
  userEmail!: string;
  declare type: NotificationEventPayload.PLATFORM_USER_PROFILE_REMOVED;
}
