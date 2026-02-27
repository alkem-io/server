import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';
import { UpdateUserSettingsNotificationPlatformAdminInput } from './user.settings.notification.platform.admin.dto.update';

@InputType()
export class UpdateUserSettingsNotificationPlatformInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  forumDiscussionCreated?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  forumDiscussionComment?: NotificationSettingInput;

  @Field(() => UpdateUserSettingsNotificationPlatformAdminInput, {
    nullable: true,
    description: 'Settings related to Platform Admin Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationPlatformAdminInput)
  admin?: UpdateUserSettingsNotificationPlatformAdminInput;
}
