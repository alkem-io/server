import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationPlatformUserProfileCreatedAdminPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED_ADMIN;
  userID: string;
}
