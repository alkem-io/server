import { Field, InputType } from '@nestjs/graphql';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class CreateSpaceSettingsMembershipInput {
  @Field(() => CommunityMembershipPolicy, {
    nullable: false,
    description: 'The membership policy in usage for this Space',
  })
  policy!: CommunityMembershipPolicy;

  @Field(() => [UUID], {
    nullable: false,
    description:
      'The organizations that are trusted to Join as members for this Space',
  })
  trustedOrganizations!: UUID[];

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to control if Subspace admins can invite for this Space.',
  })
  allowSubspaceAdminsToInviteMembers!: boolean;
}
