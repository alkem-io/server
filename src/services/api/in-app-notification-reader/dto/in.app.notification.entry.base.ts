import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { InAppNotificationPayloadBase } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.payload.base';
import { NotificationEvent } from '@common/enums/notification.event';

export abstract class IInAppNotificationEntryBase {
  id!: string;

  type!: NotificationEvent;

  triggeredAt!: Date;

  state!: InAppNotificationState;

  category!: InAppNotificationCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
