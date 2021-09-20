import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunitySendMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The community the message is being sent to',
  })
  communityID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;
}
