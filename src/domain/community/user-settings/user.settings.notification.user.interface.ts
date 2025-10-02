import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';
import { IUserSettingsNotificationUserMembership } from './user.settings.notification.user.membership.interface';

@ObjectType('UserSettingsNotificationUser')
export abstract class IUserSettingsNotificationUser {
  @Field(() => IUserSettingsNotificationUserMembership, {
    nullable: false,
    description:
      'The notifications settings for membership events for this User',
  })
  membership!: IUserSettingsNotificationUserMembership;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive notification when I receive a direct message.',
  })
  messageReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  mentioned!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  commentReply!: IUserSettingsNotificationChannels;
}
