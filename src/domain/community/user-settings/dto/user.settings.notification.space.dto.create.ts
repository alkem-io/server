import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationSpaceInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  @IsBoolean()
  adminCommunicationMessage!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  @IsBoolean()
  adminCommunityApplicationReceived!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @IsBoolean()
  adminCommunityNewMember!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a contribution is added (admin)',
  })
  @IsBoolean()
  adminCollaborationCalloutContribution!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdates!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a contribution is added',
  })
  @IsBoolean()
  collaborationCalloutContributionCreated!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive a notification when a comment is created on a contribution',
  })
  @IsBoolean()
  collaborationCalloutContributionComment!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a comment is added to a Callout',
  })
  @IsBoolean()
  collaborationCalloutComment!: CreateUserSettingsNotificationChannelsInput;

  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  @IsBoolean()
  collaborationCalloutPublished!: CreateUserSettingsNotificationChannelsInput;
}
