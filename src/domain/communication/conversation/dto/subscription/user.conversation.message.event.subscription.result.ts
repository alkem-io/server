import { Field, ObjectType } from '@nestjs/graphql';
import { MutationType } from '@common/enums/subscriptions';
import { IMessage } from '@domain/communication/message/message.interface';

@ObjectType('UserConversationMessageEventSubscriptionResult', {
  description:
    'A message event happened in a conversation the user is a member of.',
})
export class UserConversationMessageEventSubscriptionResult {
  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Conversation.',
  })
  conversationId!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The identifier for the Room.',
  })
  roomId!: string;

  @Field(() => MutationType, {
    nullable: false,
    description: 'The type of event.',
  })
  type!: MutationType;

  @Field(() => IMessage, {
    nullable: false,
    description: 'The message data.',
  })
  data!: IMessage;
}
