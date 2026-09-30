import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateOrganizationSettingsMembershipInput {
  // Optional, like its sibling below: the service already merges partially
  // (it guards each key on `!== undefined`), so a required field only forced
  // every caller to echo back a value it had read earlier — which makes two
  // admins editing different switches a last-write-wins clobber. Relaxing
  // `Boolean!` to `Boolean` is a backward-compatible schema change; callers
  // that still send it behave exactly as before.
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Allow Users with email addresses matching the domain of this Organization to join.',
  })
  @IsBoolean()
  @IsOptional()
  allowUsersMatchingDomainToJoin?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Allow Spaces to invite this Organization to join them.',
  })
  @IsBoolean()
  @IsOptional()
  allowSpaceInvitations?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Allow registered users to apply to associate with this Organization.',
  })
  @IsBoolean()
  @IsOptional()
  allowApplications?: boolean;
}
