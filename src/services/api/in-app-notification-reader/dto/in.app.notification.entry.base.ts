import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export abstract class IInAppNotificationEntryBase {
  id!: string;

  type!: NotificationEvent;

  triggeredAt!: Date;

  state!: NotificationEventInAppState;

  category!: NotificationEventCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
