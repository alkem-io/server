import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationVirtualContributor')
export abstract class IUserSettingsNotificationVirtualContributor {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive notification when a Virtual Contributor receives an invitation to join a Space.',
  })
  adminSpaceCommunityInvitation!: IUserSettingsNotificationChannels;
}
