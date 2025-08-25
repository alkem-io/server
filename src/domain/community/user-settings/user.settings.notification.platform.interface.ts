import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';
import { IUserSettingsNotificationPlatformAdmin } from './user.settings.notification.platform.admin.interface';

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

  @Field(() => IUserSettingsNotificationPlatformAdmin, {
    nullable: false,
    description:
      'The notifications settings for Platform Admin events for this User',
  })
  admin!: IUserSettingsNotificationPlatformAdmin;
}
