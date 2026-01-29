import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationOrganization } from './user.settings.notification.organization.interface';
import { IUserSettingsNotificationPlatform } from './user.settings.notification.platform.interface';
import { IUserSettingsNotificationSpace } from './user.settings.notification.space.interface';
import { IUserSettingsNotificationUser } from './user.settings.notification.user.interface';
import { IUserSettingsNotificationVirtualContributor } from './user.settings.notification.virtual.contributor.interface';

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

  @Field(() => IUserSettingsNotificationUser, {
    nullable: false,
    description: 'The notifications settings for User events for this User',
  })
  user!: IUserSettingsNotificationUser;

  @Field(() => IUserSettingsNotificationSpace, {
    nullable: false,
    description: 'The notifications settings for Space events for this User',
  })
  space!: IUserSettingsNotificationSpace;

  @Field(() => IUserSettingsNotificationVirtualContributor, {
    nullable: false,
    description:
      'The notifications settings for Virtual Contributor events for this User',
  })
  virtualContributor!: IUserSettingsNotificationVirtualContributor;
}
