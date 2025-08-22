import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationOrganization')
export abstract class IUserSettingsNotificationOrganization {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  adminMessageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  adminMentioned!: boolean;
}
