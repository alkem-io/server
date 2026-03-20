import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UnsubscribeFromPushNotificationsInput {
  @Field(() => UUID, {
    description: 'The ID of the push subscription to remove.',
  })
  subscriptionID!: string;
}
