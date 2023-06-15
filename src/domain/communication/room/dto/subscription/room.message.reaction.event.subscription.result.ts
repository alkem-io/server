import { Field, ObjectType } from '@nestjs/graphql';
import { MutationType } from '@common/enums/subscriptions';
import { IMessageReaction } from '@domain/communication/message.reaction/message.reaction.interface';

@ObjectType('RoomMessageReactionEventSubscriptionResult', {
  description: 'A message reaction event happened in the subscribed room',
})
export class RoomMessageReactionEventSubscriptionResult {
  @Field(() => MutationType, {
    nullable: false,
    description: 'The type of event.',
  })
  type!: MutationType;

  @Field(() => String, {
    nullable: false,
    description: 'The message on which the reaction event happened.',
  })
  messageID!: string;

  @Field(() => IMessageReaction, {
    nullable: false,
    description: 'A message related event.',
  })
  data!: IMessageReaction;
}
