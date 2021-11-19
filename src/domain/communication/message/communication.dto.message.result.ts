import { MessageID, UUID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Message', {
  description:
    'A message that was sent either as an Update or as part of a Discussion.',
})
export class CommunicationMessageResult {
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

  @Field(() => UUID, {
    nullable: false,
    description: 'The sender user ID',
  })
  sender!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;
}
