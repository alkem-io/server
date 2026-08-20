import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';
import { CreateUserSettingsNotificationPlatformAdminInput } from './user.settings.notification.platform.admin.dto.create';

@InputType()
export class CreateUserSettingsNotificationPlatformInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  forumDiscussionCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationChannelsInput)
  forumDiscussionComment!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationPlatformAdminInput, {
    nullable: true,
    description: 'Settings related to Space Admin Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationPlatformAdminInput)
  admin!: CreateUserSettingsNotificationPlatformAdminInput;
}
