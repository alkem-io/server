import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationSettingsPrivacy')
export abstract class IOrganizationSettingsPrivacy {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (membership, lead etc) in Spaces to be visible.',
  })
  contributionRolesPubliclyVisible!: boolean;
}
