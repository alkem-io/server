import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationVirtualContributor')
export abstract class IUserSettingsNotificationVirtualContributor {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive notification when a Virtual Contributor receives an invitation to join a Space.',
  })
  invitedToSpace!: boolean;
}
