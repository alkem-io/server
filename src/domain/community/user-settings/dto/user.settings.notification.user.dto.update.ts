import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';
import { UpdateUserSettingsNotificationUserMembershipInput } from './user.settings.notification.user.membership.dto.update';

@InputType()
export class UpdateUserSettingsNotificationUserInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive notification when I receive a message.',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  messageReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification you are mentioned',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  mentioned?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  commentReply?: NotificationSettingInput;

  @Field(() => UpdateUserSettingsNotificationUserMembershipInput, {
    nullable: true,
    description: 'Settings related to User Membership Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationUserMembershipInput)
  membership!: UpdateUserSettingsNotificationUserMembershipInput;
}
