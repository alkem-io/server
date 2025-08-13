import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';

export interface InAppNotificationPayloadBase {
  type: NotificationEvent;
  category: NotificationEventCategory;
  triggeredByID: string;
  /** UTC */
  triggeredAt: Date;
}
