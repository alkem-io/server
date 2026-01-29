import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export abstract class UpdateNotificationStateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the notification to update.',
  })
  ID!: string;

  @Field(() => NotificationEventInAppState, {
    nullable: false,
    description: 'The new state of the notification.',
  })
  state!: NotificationEventInAppState;
}
