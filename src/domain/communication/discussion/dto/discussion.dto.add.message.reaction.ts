import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
@InputType()
export class DiscussionAddMessageReactionInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Discussion the message is being reacted to',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The reaction being sent',
  })
  // todo: emoji validation
  // @MaxLength(LONG_TEXT_LENGTH)
  text!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being reacted to',
  })
  messageID!: string;
}
