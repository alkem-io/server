import { InAppNotificationState } from '@common/enums/in.app.notification.state';
import { Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { InAppNotificationPayloadBase } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.payload.base';

export abstract class IInAppNotificationEntryBase {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => InAppNotificationEventType, {
    nullable: false,
    description: 'The type of the notification',
  })
  type!: InAppNotificationEventType;

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
