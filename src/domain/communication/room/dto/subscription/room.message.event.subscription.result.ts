import { Field, ObjectType } from '@nestjs/graphql';
import { MutationType } from '@common/enums/subscriptions';
import { IMessage } from '@domain/communication/message/message.interface';
import { UUID } from '@domain/common/scalars';

@ObjectType('RoomMessageEventSubscriptionResult', {
  description: 'A message event happened in the subscribed room',
})
export class RoomMessageEventSubscriptionResult {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Room the event happened in.',
  })
  roomID!: string;

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
