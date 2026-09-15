import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';
import { CreateUserSettingsNotificationUserMembershipInput } from './user.settings.notification.user.membership.dto.create';

@InputType()
export class CreateUserSettingsNotificationUserInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive notification when I receive a message.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  messageReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  mentioned!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  commentReply!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when someone sends me a direct (1:1) chat message.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  conversationMessageDirect!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when someone posts in a group chat I am a member of.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  conversationMessageGroup!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationUserMembershipInput, {
    nullable: true,
    description: 'Settings related to User Membership Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationUserMembershipInput)
  membership!: CreateUserSettingsNotificationUserMembershipInput;
}
