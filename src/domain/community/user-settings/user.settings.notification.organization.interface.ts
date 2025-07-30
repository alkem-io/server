import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationOrganization')
export abstract class IUserSettingsNotificationOrganization {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  messageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  mentioned!: boolean;
}
