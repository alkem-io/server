import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { NotificationEvent } from '@common/enums/notification.event';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotification')
export class IInAppNotification extends IBaseAlkemio {
  // Meta information for classifying the InAppNotifications
  @Field(() => NotificationEvent, {
    nullable: false,
    description: 'The type of the notification event.',
  })
  type!: NotificationEvent;

  @Field(() => NotificationEventInAppState, {
    nullable: false,
    description: 'The state of the notification event.',
  })
  state!: NotificationEventInAppState;

  @Field(() => NotificationEventCategory, {
    nullable: false,
    description: 'The category of the notification event.',
  })
  category!: NotificationEventCategory;

  @Field(() => Date, {
    nullable: false,
    description: 'The triggered date of the notification event.',
  })
  triggeredAt!: Date;

  triggeredByID!: string;

  // The receiver of the notification
  receiverID!: string;

  // Additional data
  payload!: IInAppNotificationPayload;
}
