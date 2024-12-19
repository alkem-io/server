import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateOrganizationSettingsPrivacyInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (membership, lead etc) in Spaces to be visible.',
  })
  contributionRolesPubliclyVisible!: boolean;
}
