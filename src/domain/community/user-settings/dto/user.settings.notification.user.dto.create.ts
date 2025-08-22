import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationUserInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive notification when I receive a message.',
  })
  @IsBoolean()
  messageReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive notification I send a message.',
  })
  @IsBoolean()
  messageSent!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  @IsBoolean()
  mentioned!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  @IsBoolean()
  commentReply!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when an application is submitted',
  })
  @IsBoolean()
  spaceCommunityApplicationSubmitted!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification for community invitation',
  })
  @IsBoolean()
  spaceCommunityInvitation!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when I join a new community',
  })
  @IsBoolean()
  spaceCommunityJoined!: CreateUserSettingsNotificationChannelsInput;
}
