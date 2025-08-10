import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { InAppNotificationPayloadBase } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.payload.base';

export class IInAppNotification extends IBaseAlkemio {
  type!: InAppNotificationEventType;

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
