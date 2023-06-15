import { Field, ObjectType } from '@nestjs/graphql';
import { RoomMessageEventSubscriptionResult } from './room.message.event.subscription.result';
import { RoomMessageReactionEventSubscriptionResult } from './room.message.reaction.event.subscription.result';

@ObjectType('RoomEventSubscriptionResult', {
  description: 'The event happened in the subscribed room',
})
export class RoomEventSubscriptionResult {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Room on which the event happened.',
  })
  roomID!: string;

  @Field(() => RoomMessageEventSubscriptionResult, {
    nullable: true,
    description: 'A message related event.',
  })
  message?: RoomMessageEventSubscriptionResult

  @Field(() => RoomMessageReactionEventSubscriptionResult, {
    nullable: true,
    description: 'A message reaction related event.',
  })
  reaction?: RoomMessageReactionEventSubscriptionResult;
}
