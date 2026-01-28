import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';

export interface InAppNotificationPayloadBase {
  type: NotificationEvent;
  category: NotificationEventCategory;
  triggeredByID: string;
  /** UTC */
  triggeredAt: Date;
}
