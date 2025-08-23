import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationUserInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive notification when I receive a message.',
  })
  messageReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive notification I send a message to a User, Organization or Space.',
  })
  copyOfMessageSent?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification you are mentioned',
  })
  mentioned?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  commentReply?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when an application is submitted',
  })
  @IsBoolean()
  spaceCommunityApplicationSubmitted?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification for community invitation',
  })
  @IsBoolean()
  spaceCommunityInvitation?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when I join a new community',
  })
  @IsBoolean()
  spaceCommunityJoined?: boolean;
}
