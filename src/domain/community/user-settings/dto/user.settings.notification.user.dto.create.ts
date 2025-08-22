import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsNotificationUserInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notification when I receive a message.',
  })
  @IsBoolean()
  messageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notification I send a message.',
  })
  @IsBoolean()
  messageSent!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  @IsBoolean()
  mentioned!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  @IsBoolean()
  commentReply!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is submitted',
  })
  @IsBoolean()
  spaceCommunityApplicationSubmitted!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community invitation',
  })
  @IsBoolean()
  spaceCommunityInvitation!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when I join a new community',
  })
  @IsBoolean()
  spaceCommunityJoined!: boolean;
}
