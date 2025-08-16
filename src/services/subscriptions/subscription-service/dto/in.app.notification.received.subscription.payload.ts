import { BaseSubscriptionPayload } from '@common/interfaces';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';

export interface InAppNotificationReceivedSubscriptionPayload
  extends BaseSubscriptionPayload {
  notification: IInAppNotification;
}
