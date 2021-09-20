import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CommunityRemoveMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The community the message is being sent to',
  })
  communityID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message id that should be removed',
  })
  messageId!: string;
}
