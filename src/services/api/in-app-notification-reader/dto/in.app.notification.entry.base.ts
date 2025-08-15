import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayload } from '@platform/in-app-notification/dto/payload/in.app.notification.payload.base';

export abstract class IInAppNotificationEntryBase {
  id!: string;

  type!: NotificationEvent;

  category!: NotificationEventCategory;

  state!: NotificationEventInAppState;

  triggeredAt!: Date;
  triggeredByID!: string;

  receiverID!: string;

  payload!: InAppNotificationPayload;
}
