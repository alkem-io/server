import { Field, ObjectType } from '@nestjs/graphql';
import { MutationType } from '@common/enums/subscriptions';
import { IMessage } from '@domain/communication/message/message.interface';

@ObjectType('RoomMessageEventSubscriptionResult', {
  description: 'A message event happened in the subscribed room',
})
export class RoomMessageEventSubscriptionResult {
  @Field(() => MutationType, {
    nullable: false,
    description: 'The type of event.',
  })
  type!: MutationType;

  @Field(() => IMessage, {
    nullable: false,
    description: 'A message related event.',
  })
  data!: IMessage;
}
