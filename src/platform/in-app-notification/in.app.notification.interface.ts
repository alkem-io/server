import { InAppNotificationPayloadBase } from '@alkemio/notifications-lib';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { InAppNotificationState } from '@platform/in-app-notification/enums/in.app.notification.state';
import { NotificationEventType } from '@platform/in-app-notification/enums/notification.event.type';
import { InAppNotificationCategory } from '@platform/in-app-notification/enums/in.app.notification.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

export class IInAppNotification extends IBaseAlkemio {
  type!: NotificationEventType;

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
