import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateOrganizationSettingsMembershipInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Allow Users with email addresses matching the domain of this Organization to join.',
  })
  @IsBoolean()
  allowUsersMatchingDomainToJoin!: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Allow Spaces to invite this Organization to join them.',
  })
  @IsBoolean()
  @IsOptional()
  allowSpaceInvitations?: boolean;
}
