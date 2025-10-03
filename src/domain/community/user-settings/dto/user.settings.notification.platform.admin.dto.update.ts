import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationPlatformAdminInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: '[Admin] Receive notification when a new user signs up',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  userProfileCreated?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      '[Admin] Receive a notification when a user profile is removed',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  userProfileRemoved?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      '[Admin] Receive a notification when a new L0 Space is created',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  spaceCreated?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      '[Admin] Receive a notification user is assigned or removed from a global role',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  userGlobalRoleChanged?: NotificationSettingInput;
}
