import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';

@InputType()
export class UpdateUserSettingsNotificationSpaceAdminInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  communicationMessageReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification when an application is received',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  communityApplicationReceived?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  communityNewMember?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification when a contribution is added (admin)',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  collaborationCalloutContributionCreated?: NotificationSettingInput;
}
