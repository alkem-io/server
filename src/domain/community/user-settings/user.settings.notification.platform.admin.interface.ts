import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationPlatformAdmin')
export abstract class IUserSettingsNotificationPlatformAdmin {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive notification when a new user signs up',
  })
  userProfileCreated!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a user profile is removed',
  })
  userProfileRemoved!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a user global role is assigned or removed.',
  })
  userGlobalRoleChanged!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a new L0 Space is created',
  })
  spaceCreated!: IUserSettingsNotificationChannels;
}
