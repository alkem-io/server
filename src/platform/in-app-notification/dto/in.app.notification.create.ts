import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { InAppNotificationAdditionalData } from './in.app.notification.additional.data';

export class CreateInAppNotificationInput {
  type!: NotificationEvent;
  category!: NotificationEventCategory;
  triggeredByID!: string;
  triggeredAt!: Date;
  receiverID!: string;
  sourceEntityID?: string;
  // Additional data
  payload!: InAppNotificationAdditionalData;
}
