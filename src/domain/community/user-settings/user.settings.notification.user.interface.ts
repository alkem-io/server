import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationUser')
export abstract class IUserSettingsNotificationUser {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when I join a Space',
  })
  spaceCommunityJoined!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when an application for a Space is submitted',
  })
  spaceCommunityApplicationSubmitted!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when I am invited to join a Space community',
  })
  spaceCommunityInvitationReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notification when I receive a direct message.',
  })
  messageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive notification I send a message to a User, Organization or Space.',
  })
  messageSent!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification you are mentioned',
  })
  mentioned!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when someone replies to a comment I made.',
  })
  commentReply!: boolean;
}
