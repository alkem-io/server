import {
  InAppNotificationCategory,
  InAppNotificationPayloadBase,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { InAppNotificationState } from '@platform/in-app-notification/enums/in.app.notification.state';
import { Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';

export abstract class IInAppNotificationEntryBase {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => NotificationEventType, {
    nullable: false,
    description: 'The type of the notification',
  })
  type!: NotificationEventType;

  @Field(() => Date, {
    nullable: false,
    description: 'When (UTC) was the notification sent.',
  })
  triggeredAt!: Date;

  @Field(() => InAppNotificationState, {
    nullable: false,
    description: 'The current state of the notification',
  })
  state!: InAppNotificationState;

  @Field(() => InAppNotificationCategory, {
    nullable: false,
    description: 'Which category (role) is this notification targeted to.',
  })
  category!: InAppNotificationCategory;

  receiverID!: string;

  payload!: InAppNotificationPayloadBase;
}
