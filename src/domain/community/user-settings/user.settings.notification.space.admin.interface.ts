import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationSpaceAdmin')
export abstract class IUserSettingsNotificationSpaceAdmin {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  communityNewMember!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  communityApplicationReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  communicationMessageReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a contribution is created (admin)',
  })
  collaborationCalloutContributionCreated!: IUserSettingsNotificationChannels;
}
