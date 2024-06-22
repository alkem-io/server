import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceSettingsMembership')
export abstract class ISpaceSettingsMembership {
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
    description: 'Allow subspace admins to invite to this Space.',
  })
  allowSubspaceAdminsToInviteMembers!: boolean;
}
