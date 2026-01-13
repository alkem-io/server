import { MessageID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
import { IMessageReaction } from '../message.reaction/message.reaction.interface';

@ObjectType('Message', {
  description: 'A message that was sent in a chat room',
})
export class IMessage {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The id for the message event.',
  })
  id!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;

  // Agent ID of the sender - resolved to Contributor by field resolver
  sender!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;

  @Field(() => [IMessageReaction], {
    nullable: false,
    description: 'Reactions on this message',
  })
  reactions!: IMessageReaction[];

  @Field(() => String, {
    nullable: true,
    description: 'The message being replied to',
  })
  threadID?: string;
}
