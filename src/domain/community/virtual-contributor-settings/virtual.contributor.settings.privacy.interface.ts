import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VirtualContributorSettingsPrivacy')
export abstract class IVirtualContributorSettingsPrivacy {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (membership, lead etc) in Spaces to be visible.',
  })
  contributionRolesPubliclyVisible!: boolean;
}
