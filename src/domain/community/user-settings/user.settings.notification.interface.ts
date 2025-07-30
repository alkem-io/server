import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationPlatform } from './user.settings.notification.platform.interface';
import { IUserSettingsNotificationOrganization } from './user.settings.notification.organization.interface';

@ObjectType('UserSettingsNotification')
export abstract class IUserSettingsNotification {
  @Field(() => IUserSettingsNotificationPlatform, {
    nullable: false,
    description: 'The notifications settings for Platform events for this User',
  })
  platform!: IUserSettingsNotificationPlatform;

  @Field(() => IUserSettingsNotificationOrganization, {
    nullable: false,
    description:
      'The notifications settings for Organization events for this User',
  })
  organization!: IUserSettingsNotificationOrganization;
}
