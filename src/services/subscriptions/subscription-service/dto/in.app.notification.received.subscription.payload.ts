import { BaseSubscriptionPayload } from '@common/interfaces';
import { InAppNotification } from '@domain/in-app-notification-reader/in.app.notification.interface';

export interface InAppNotificationReceivedSubscriptionPayload
  extends BaseSubscriptionPayload {
  notification: InAppNotification;
}
