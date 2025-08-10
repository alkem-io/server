import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { InAppNotificationPayloadBase } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.payload.base';

export abstract class IInAppNotificationEntryBase {
  id!: string;

  type!: InAppNotificationEventType;

  triggeredAt!: Date;

  state!: InAppNotificationState;

  category!: InAppNotificationCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
