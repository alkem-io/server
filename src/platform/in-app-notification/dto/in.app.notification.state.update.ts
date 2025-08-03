import { Field, InputType } from '@nestjs/graphql';
import { InAppNotificationState } from '@platform/in-app-notification/enums/in.app.notification.state';
import { UUID } from '@domain/common/scalars';

@InputType()
export abstract class UpdateNotificationStateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the notification to update.',
  })
  ID!: string;

  @Field(() => InAppNotificationState, {
    nullable: false,
    description: 'The new state of the notification.',
  })
  state!: InAppNotificationState;
}
