import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export abstract class IInAppNotificationEntryBase {
  id!: string;

  type!: NotificationEvent;

  triggeredAt!: Date;

  state!: InAppNotificationState;

  category!: InAppNotificationCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
