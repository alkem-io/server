import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DiscussionRemoveMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The Discussion the message is being removed from to',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageId!: string;
}
