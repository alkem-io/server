import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';

@ObjectType('UserSettingsNotificationUser')
export abstract class IUserSettingsNotificationUser {
  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when I join a Space',
  })
  spaceCommunityJoined!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when an application for a Space is submitted',
  })
  spaceCommunityApplicationSubmitted!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when I am invited to join a Space community',
  })
  spaceCommunityInvitationReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive notification when I receive a direct message.',
  })
  messageReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive notification I send a message to a User, Organization or Space.',
  })
  copyOfMessageSent!: IUserSettingsNotificationChannels;

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
