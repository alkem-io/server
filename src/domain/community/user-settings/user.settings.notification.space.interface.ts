import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';
import { IUserSettingsNotificationSpaceAdmin } from './user.settings.notification.space.admin.interface';

@ObjectType('UserSettingsNotificationSpace')
export abstract class IUserSettingsNotificationSpace {
  @Field(() => IUserSettingsNotificationSpaceAdmin, {
    nullable: false,
    description:
      'The notifications settings for Space Admin events for this User',
  })
  admin!: IUserSettingsNotificationSpaceAdmin;

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

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a calendar event is created',
  })
  communityCalendarEvents!: IUserSettingsNotificationChannels;
}
