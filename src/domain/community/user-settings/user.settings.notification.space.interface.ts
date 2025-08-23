import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationSpace')
export abstract class IUserSettingsNotificationSpace {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  adminCommunityNewMember!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  adminCommunityApplicationReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  adminCommunicationMessageReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a contribution is created (admin)',
  })
  adminCollaborationCalloutContributionCreated!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  communicationUpdates!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  collaborationCalloutPublished!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a comment is made on a Callout',
  })
  collaborationCalloutComment!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a contribution is created',
  })
  collaborationCalloutContributionCreated!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a comment is created on a Post contribution',
  })
  collaborationCalloutPostContributionComment!: IUserSettingsNotificationChannels;
}
