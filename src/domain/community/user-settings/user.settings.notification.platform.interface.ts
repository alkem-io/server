import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationPlatform')
export abstract class IUserSettingsNotificationPlatform {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  forumDiscussionCreated!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  forumDiscussionComment!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive notification when a new user signs up',
  })
  adminUserProfileCreated!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a user profile is removed',
  })
  adminUserProfileRemoved!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a user global role is assigned or removed.',
  })
  adminUserGlobalRoleChanged!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a new L0 Space is created',
  })
  adminSpaceCreated!: IUserSettingsNotificationChannels;
}
