import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { UpdateUserSettingsNotificationOrganizationInput } from './user.settings.notification.organization.dto.update';
import { UpdateUserSettingsNotificationPlatformInput } from './user.settings.notification.platform.dto.update';
import { UpdateUserSettingsNotificationSpaceInput } from './user.settings.notification.space.dto.update';
import { UpdateUserSettingsNotificationUserInput } from './user.settings.notification.user.dto.update';
import { UpdateUserSettingsNotificationVirtualContributorInput } from './user.settings.notification.virtual.contributor.dto.update';

@InputType()
export class UpdateUserSettingsNotificationInput {
  @Field(() => UpdateUserSettingsNotificationOrganizationInput, {
    nullable: true,
    description: 'Settings related to Organization Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationOrganizationInput)
  organization?: UpdateUserSettingsNotificationOrganizationInput;

  @Field(() => UpdateUserSettingsNotificationUserInput, {
    nullable: true,
    description: 'Settings related to User Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationUserInput)
  user?: UpdateUserSettingsNotificationUserInput;

  @Field(() => UpdateUserSettingsNotificationVirtualContributorInput, {
    nullable: true,
    description: 'Settings related to Virtual Contributor Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationVirtualContributorInput)
  virtualContributor?: UpdateUserSettingsNotificationVirtualContributorInput;

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
