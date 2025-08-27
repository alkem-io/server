import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, ValidateNested } from 'class-validator';
import { UpdateUserSettingsNotificationPlatformAdminInput } from './user.settings.notification.platform.admin.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationPlatformInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  @IsBoolean()
  forumDiscussionCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  @IsBoolean()
  forumDiscussionComment?: boolean;

  @Field(() => UpdateUserSettingsNotificationPlatformAdminInput, {
    nullable: true,
    description: 'Settings related to Platform Admin Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationPlatformAdminInput)
  admin?: UpdateUserSettingsNotificationPlatformAdminInput;
}
