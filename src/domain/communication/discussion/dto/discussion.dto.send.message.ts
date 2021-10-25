import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DiscussionSendMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The Discussion the message is being sent to',
  })
  discussionID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;
}
