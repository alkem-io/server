import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationOrganizationInput } from './user.settings.notification.organization.dto.create';
import { CreateUserSettingsNotificationPlatformInput } from './user.settings.notification.platform.dto.create';
import { CreateUserSettingsNotificationSpaceInput } from './user.settings.notification.space.dto.create';
import { CreateUserSettingsNotificationUserInput } from './user.settings.notification.user.dto.create';
import { CreateUserSettingsNotificationVirtualContributorInput } from './user.settings.notification.virtual.contributor.dto.create';

@InputType()
export class CreateUserSettingsNotificationInput {
  @Field(() => CreateUserSettingsNotificationOrganizationInput, {
    nullable: true,
    description: 'Settings related to Organization Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationOrganizationInput)
  organization?: CreateUserSettingsNotificationOrganizationInput;

  @Field(() => CreateUserSettingsNotificationUserInput, {
    nullable: true,
    description: 'Settings related to User Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationUserInput)
  user?: CreateUserSettingsNotificationUserInput;

  @Field(() => CreateUserSettingsNotificationVirtualContributorInput, {
    nullable: true,
    description: 'Settings related to Virtual Contributor Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationVirtualContributorInput)
  virtualContributor?: CreateUserSettingsNotificationVirtualContributorInput;

  @Field(() => CreateUserSettingsNotificationPlatformInput, {
    nullable: true,
    description: 'Settings related to Platform Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationPlatformInput)
  platform?: CreateUserSettingsNotificationPlatformInput;

  @Field(() => CreateUserSettingsNotificationSpaceInput, {
    nullable: true,
    description: 'Settings related to Space Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationSpaceInput)
  space?: CreateUserSettingsNotificationSpaceInput;
}
