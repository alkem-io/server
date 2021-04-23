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
    description: 'The user sending the message',
  })
  sendingUserID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent',
  })
  message!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the room the message is being sent to, if available',
  })
  roomID?: string;
}
