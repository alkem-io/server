import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { InAppNotificationPayload } from './payload/in.app.notification.payload.base';

export class CreateInAppNotificationInput {
  type!: NotificationEvent;
  category!: NotificationEventCategory;
  triggeredByID!: string;
  triggeredAt!: Date;
  receiverID!: string;
  sourceEntityID?: string;
  // Additional data
  payload!: InAppNotificationPayload;
}
