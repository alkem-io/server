import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsPrivacy')
export abstract class IUserSettingsPrivacy {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (communication, lead etc) in Spaces to be visible.',
  })
  contributionRolesPubliclyVisible!: boolean;
}
