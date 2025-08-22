import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsPrivacyInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow contribution roles (communication, lead etc) in Spaces to be visible.',
  })
  @IsBoolean()
  contributionRolesPubliclyVisible!: boolean;
}
