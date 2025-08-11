import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { NotificationEvent } from '@common/enums/notification.event';

export interface InAppNotificationPayloadBase {
  receiverIDs: string[];
  /** UTC */
  triggeredAt: Date;
  type: NotificationEvent;
  triggeredByID: string;
  category: InAppNotificationCategory;
}
