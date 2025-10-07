import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { UpdateUserSettingsNotificationSpaceAdminInput } from './user.settings.notification.space.admin.dto.update';
import { NotificationSettingInput } from './notification.setting.input';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationSpaceInput {
  @Field(() => UpdateUserSettingsNotificationSpaceAdminInput, {
    nullable: true,
    description: 'Settings related to Space Admin Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationSpaceAdminInput)
  admin?: UpdateUserSettingsNotificationSpaceAdminInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification for community updates',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  communicationUpdates?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification when a contribution is added',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  collaborationCalloutContributionCreated?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive a notification when a comment is created on a contribution',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  collaborationCalloutPostContributionComment?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification when a comment is added to a Callout',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  collaborationCalloutComment?: NotificationSettingInput;

  @Field(() => NotificationSettingInput, {
    nullable: true,
    description: 'Receive a notification when a callout is published',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  collaborationCalloutPublished?: NotificationSettingInput;
}
