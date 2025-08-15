import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationAdditionalData } from './dto/in.app.notification.additional.data';

export class IInAppNotification extends IBaseAlkemio {
  // Meta information for classifying the InAppNotifications
  type!: NotificationEvent;
  state!: NotificationEventInAppState;
  category!: NotificationEventCategory;

  // The agent who triggered the notification
  triggeredAt!: Date;
  triggeredBy?: IContributor; // exposed via the interface field resolver

  // The entity that this notification was triggered on, if any
  sourceEntityID?: string;

  // The receiver of the notification
  receiverID!: string;

  // Additional data
  payload!: InAppNotificationAdditionalData;
}
