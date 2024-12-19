import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateOrganizationSettingsMembershipInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow Users with email addresses matching the domain of this Organization to join.',
  })
  allowUsersMatchingDomainToJoin!: boolean;
}
