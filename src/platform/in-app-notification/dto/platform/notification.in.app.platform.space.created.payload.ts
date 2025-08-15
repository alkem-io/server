import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../../../../services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export interface InAppNotificationPlatformSpaceCreatedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.PLATFORM_SPACE_CREATED;
  spaceID: string;
}
