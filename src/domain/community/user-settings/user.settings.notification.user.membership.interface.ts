import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationUserMembership')
export abstract class IUserSettingsNotificationUserMembership {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when I join a Space or when my application is declined',
  })
  spaceCommunityJoined!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when I am invited to join a Space community',
  })
  spaceCommunityInvitationReceived!: IUserSettingsNotificationChannels;
}
