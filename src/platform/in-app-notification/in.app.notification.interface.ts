import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayload } from './dto/payload/in.app.notification.payload.base';

export class IInAppNotification extends IBaseAlkemio {
  // Meta information for classifying the InAppNotifications
  type!: NotificationEvent;
  state!: NotificationEventInAppState;
  category!: NotificationEventCategory;

  // The agent who triggered the notification
  triggeredAt!: Date;
  triggeredBy?: IContributor; // exposed via the interface field resolver

  // The receiver of the notification
  receiverID!: string;

  // The entity that this notification was triggered on, if any
  sourceEntityID?: string;

  // Additional data
  payload!: InAppNotificationPayload;
}
