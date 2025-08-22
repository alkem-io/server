import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationOrganization')
export abstract class IUserSettingsNotificationOrganization {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  adminMessageReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  adminMentioned!: IUserSettingsNotificationChannels;
}
