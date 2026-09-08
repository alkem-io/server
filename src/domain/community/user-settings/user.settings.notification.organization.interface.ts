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

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when an organization you administer is invited to a Space',
  })
  adminSpaceCommunityInvitation!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when someone responds to an invitation to associate with an organisation you administer',
  })
  adminAssociateInvitationResponse!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when someone applies to associate with an organisation you administer',
  })
  adminAssociateApplicationReceived!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when someone joins an organisation you administer as an associate',
  })
  adminAssociateJoined!: IUserSettingsNotificationChannels;
}
