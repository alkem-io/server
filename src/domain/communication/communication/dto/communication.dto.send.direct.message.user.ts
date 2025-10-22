import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UserSendMessageInput {
  @Field(() => String, {
    nullable: false,
    description: 'The user a message is being sent to',
  })
  receivingUserID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;
}
