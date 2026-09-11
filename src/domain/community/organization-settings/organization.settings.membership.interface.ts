import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OrganizationSettingsMembership')
export abstract class IOrganizationSettingsMembership {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow Users with email addresses matching the domain of this Organization to join.',
  })
  allowUsersMatchingDomainToJoin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Allow Spaces to invite this Organization to join them.',
  })
  allowSpaceInvitations!: boolean;
}
