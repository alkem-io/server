import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateVirtualContributorSettingsPrivacyInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (membership, lead etc) in Spaces to be visible.',
  })
  @IsBoolean()
  contributionRolesPubliclyVisible!: boolean;
}
