import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';

export interface InAppNotificationPayloadBase {
  receiverIDs: string[];
  /** UTC */
  triggeredAt: Date;
  type: InAppNotificationEventType;
  triggeredByID: string;
  category: InAppNotificationCategory;
}
