import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationPlatformUserProfileRemovedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.PLATFORM_USER_PROFILE_REMOVED;
  userDisplayName: string;
  userEmail: string;
}
