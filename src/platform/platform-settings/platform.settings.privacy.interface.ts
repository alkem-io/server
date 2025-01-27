import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PlatformSettingsPrivacy')
export abstract class IPlatformSettingsPrivacy {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (membership, lead etc) in Spaces to be visible.',
  })
  contributionRolesPubliclyVisible!: boolean;
}
