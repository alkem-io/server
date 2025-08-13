import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export class IInAppNotification extends IBaseAlkemio {
  type!: NotificationEvent;

  triggeredAt!: Date;

  state!: NotificationEventInAppState;

  category!: NotificationEventCategory;
  // exposed via the interface field resolver
  triggeredBy?: IContributor;
  receiver?: IContributor;
  receiverID!: string;
  //
  payload!: InAppNotificationPayloadBase;
}
