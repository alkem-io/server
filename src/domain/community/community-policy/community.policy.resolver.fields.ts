import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CommunityRole } from '@common/enums/community.role';
import { ICommunityPolicy } from './community.policy.interface';
import { CommunityPolicyService } from './community.policy.service';
import { ICommunityRolePolicy } from './community.policy.role.interface';

@Resolver(() => ICommunityPolicy)
export class CommunityPolicyResolverFields {
  constructor(private communityPolicyService: CommunityPolicyService) {}

  @ResolveField('member', () => ICommunityRolePolicy, {
    nullable: false,
    description: 'The role policy that defines the members for this Community.',
  })
  member(@Parent() communityPolicy: ICommunityPolicy): ICommunityRolePolicy {
    return this.communityPolicyService.getCommunityRolePolicy(
      communityPolicy,
      CommunityRole.MEMBER
    );
  }

  @ResolveField('lead', () => ICommunityRolePolicy, {
    nullable: false,
    description: 'The role policy that defines the leads for this Community.',
  })
  lead(@Parent() communityPolicy: ICommunityPolicy): ICommunityRolePolicy {
    return this.communityPolicyService.getCommunityRolePolicy(
      communityPolicy,
      CommunityRole.LEAD
    );
  }

  @ResolveField('admin', () => ICommunityRolePolicy, {
    nullable: false,
    description: 'The role policy that defines the Admins for this Community.',
  })
  admin(@Parent() communityPolicy: ICommunityPolicy): ICommunityRolePolicy {
    return this.communityPolicyService.getCommunityRolePolicy(
      communityPolicy,
      CommunityRole.ADMIN
    );
  }
}
