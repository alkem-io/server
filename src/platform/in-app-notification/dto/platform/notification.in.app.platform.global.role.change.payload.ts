import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationPlatformGlobalRoleChangePayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.PLATFORM_GLOBAL_ROLE_CHANGE;
  userID: string;
  roleName: string;
}
