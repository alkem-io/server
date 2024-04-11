import { Emoji, MessageID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
@ObjectType('Reaction', {
  description: 'A reaction to a message.',
})
export class IMessageReaction {
  @Field(() => MessageID, {
    nullable: false,
    description: 'The id for the reaction.',
  })
  id!: string;

  @Field(() => Emoji, {
    nullable: false,
    description: 'The reaction Emoji',
  })
  emoji!: string;

  sender!: string;
  senderType!: 'user' | 'virtualContributor';

  @Field(() => Number, {
    nullable: false,
    description: 'The server timestamp in UTC',
  })
  timestamp!: number;
}
