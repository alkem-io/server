import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateUserSettingsNotificationUserInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notification when I receive a message.',
  })
  messageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notification I send a message.',
  })
  messageSent!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  mentioned!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  commentReply!: boolean;
}
