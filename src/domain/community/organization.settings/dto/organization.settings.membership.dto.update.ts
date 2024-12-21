import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateOrganizationSettingsMembershipInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow Users with email addresses matching the domain of this Organization to join.',
  })
  @IsBoolean()
  allowUsersMatchingDomainToJoin!: boolean;
}
