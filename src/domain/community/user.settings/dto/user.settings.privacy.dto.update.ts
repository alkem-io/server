import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserSettingsPrivacyInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (communication, lead etc) in Spaces to be visible.',
  })
  contributionRolesPubliclyVisible!: boolean;
}
