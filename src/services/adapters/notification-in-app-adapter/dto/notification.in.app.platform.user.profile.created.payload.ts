import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';

export interface InAppNotificationPlatformUserProfileCreatedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.PLATFORM_USER_PROFILE_CREATED;
  userID: string;
}
