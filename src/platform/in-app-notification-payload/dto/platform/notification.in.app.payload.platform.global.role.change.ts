import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { InAppNotificationPayloadPlatformBase } from './notification.in.app.payload.platform.base';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
@ObjectType('InAppNotificationPayloadPlatformGlobalRoleChange', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformGlobalRoleChange extends InAppNotificationPayloadPlatformBase {
  userID!: string;
  roleName!: string;
  declare type: NotificationEventPayload.PLATFORM_GLOBAL_ROLE_CHANGE;
}
