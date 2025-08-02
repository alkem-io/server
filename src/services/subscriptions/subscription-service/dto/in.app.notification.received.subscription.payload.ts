import { BaseSubscriptionPayload } from '@common/interfaces';
import { IInAppNotification } from '@domain/in-app-notification/in.app.notification.interface';

export interface InAppNotificationReceivedSubscriptionPayload
  extends BaseSubscriptionPayload {
  notification: IInAppNotification;
}
