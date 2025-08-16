import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

export class CreateInAppNotificationInput {
  type!: NotificationEvent;
  category!: NotificationEventCategory;
  triggeredByID!: string;
  triggeredAt!: Date;
  receiverID!: string;
  sourceEntityID?: string;
  // Additional data
  payload!: IInAppNotificationPayload;
}
