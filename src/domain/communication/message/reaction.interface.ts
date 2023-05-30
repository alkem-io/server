import { MessageID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Reaction', {
  description: 'A reaction to a message.',
})
export class IReaction {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The id for the message event.',
  })
  id!: string;

  @Field(() => Markdown, {
    nullable: false,
    description: 'The reaction text',
  })
  text!: string;

  sender!: string;

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;

  @Field(() => MessageID, {
    nullable: false,
    description: 'The id for the message that it was reacted on.',
  })
  messageId!: string;
}
