import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationOrganizationInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminMessageReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminMentioned?: NotificationSettingInput;
}
