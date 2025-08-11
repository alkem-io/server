import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '@services/adapters/notification-in-app-adapter/dto/notification.in.app.payload.base';

export class IInAppNotification extends IBaseAlkemio {
  type!: NotificationEvent;

  triggeredAt!: Date;

  state!: InAppNotificationState;

  category!: InAppNotificationCategory;
  // exposed via the interface field resolver
  triggeredBy?: IContributor;
  receiver?: IContributor;
  receiverID!: string;
  //
  payload!: InAppNotificationPayloadBase;
}
