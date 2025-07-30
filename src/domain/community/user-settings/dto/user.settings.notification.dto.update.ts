import { Field, InputType } from '@nestjs/graphql';
import { UpdateUserSettingsNotificationOrganizationInput } from './user.settings.notification.organization.dto.update';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateUserSettingsNotificationPlatformInput } from './user.settings.notification.platform.dto.update';
import { UpdateUserSettingsNotificationSpaceInput } from './user.settings.notification.space.dto.update';

@InputType()
export class UpdateUserSettingsNotificationInput {
  @Field(() => UpdateUserSettingsNotificationOrganizationInput, {
    nullable: true,
    description: 'Settings related to Organization Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationOrganizationInput)
  organization?: UpdateUserSettingsNotificationOrganizationInput;

  @Field(() => UpdateUserSettingsNotificationPlatformInput, {
    nullable: true,
    description: 'Settings related to Platform Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationPlatformInput)
  platform?: UpdateUserSettingsNotificationPlatformInput;

  @Field(() => UpdateUserSettingsNotificationSpaceInput, {
    nullable: true,
    description: 'Settings related to Space Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationSpaceInput)
  space?: UpdateUserSettingsNotificationSpaceInput;
}
