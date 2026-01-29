import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';
import { CreateUserSettingsNotificationSpaceAdminInput } from './user.settings.notification.space.admin.dto.create';

@InputType()
export class CreateUserSettingsNotificationSpaceInput {
  @Field(() => CreateUserSettingsNotificationSpaceAdminInput, {
    nullable: true,
    description: 'Settings related to Space Admin Notifications.',
  })
  @ValidateNested()
  @Type(() => CreateUserSettingsNotificationSpaceAdminInput)
  admin!: CreateUserSettingsNotificationSpaceAdminInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  communicationUpdates!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a contribution is added',
  })
  collaborationCalloutContributionCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a comment is created on a contribution',
  })
  collaborationCalloutPostContributionComment!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a comment is added to a Callout',
  })
  collaborationCalloutComment!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  collaborationCalloutPublished!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a calendar event is created',
  })
  communityCalendarEvents!: CreateUserSettingsNotificationChannelsInput;
}
