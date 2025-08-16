import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsPrivacyInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Allow contribution roles (communication, lead etc) in Spaces to be visible.',
  })
  @IsBoolean()
  contributionRolesPubliclyVisible?: boolean;
}
