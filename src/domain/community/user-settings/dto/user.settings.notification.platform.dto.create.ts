import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationPlatformInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  @IsBoolean()
  forumDiscussionCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  @IsBoolean()
  forumDiscussionComment!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: '[Admin] Receive notification when a new user signs up',
  })
  @IsBoolean()
  adminUserProfileCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a user profile is removed',
  })
  @IsBoolean()
  adminUserProfileRemoved!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a new L0 Space is created',
  })
  @IsBoolean()
  adminSpaceCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      '[Admin] Receive a notification user is assigned or removed from a global role',
  })
  @IsBoolean()
  adminGlobalRoleChanged!: CreateUserSettingsNotificationChannelsInput;
}
