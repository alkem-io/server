import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver, Args } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUser } from '@domain/community/user';
import { IUserGroup } from '@domain/community/user-group';
import { IApplication } from '@domain/community/application';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { IOrganization } from '../organization';
import { CommunityRole } from '@common/enums/community.role';
import { PaginationArgs, PaginatedUsers } from '@core/pagination';
import { UserService } from '../user/user.service';
import { UserFilterInput } from '@core/filtering';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(
    private communityService: CommunityService,
    private userService: UserService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('memberUsers', () => [IUser], {
    nullable: true,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async memberUsers(@Parent() community: Community) {
    return await this.communityService.getUsersWithRole(
      community,
      CommunityRole.MEMBER
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('memberOrganizations', () => [IOrganization], {
    nullable: true,
    description: 'All Organizations that are contributing to this Community.',
  })
  @Profiling.api
  async memberOrganizations(@Parent() community: Community) {
    return await this.communityService.getOrganizationsWithRole(
      community,
      CommunityRole.MEMBER
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableMemberUsers', () => PaginatedUsers, {
    nullable: true,
    description: 'All available users that are potential Community members.',
  })
  @Profiling.api
  async availableMemberUsers(
    @Parent() community: Community,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const memberRoleCredentials =
      this.communityService.getCredentialDefinitionForRole(
        community,
        CommunityRole.MEMBER
      );

    const parrentCommunityMemberCredentials = community.parentCommunity
      ? this.communityService.getCredentialDefinitionForRole(
          community?.parentCommunity,
          CommunityRole.MEMBER
        )
      : undefined;

    const communityMemberCredentials = {
      member: memberRoleCredentials,
      parrentCommunityMember: parrentCommunityMemberCredentials,
    };

    return this.userService.getPaginatedAvailableMemberUsers(
      communityMemberCredentials,
      pagination,
      filter
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('leadUsers', () => [IUser], {
    nullable: true,
    description: 'All users that are leads in this Community.',
  })
  @Profiling.api
  async leadUsers(@Parent() community: Community) {
    return await this.communityService.getUsersWithRole(
      community,
      CommunityRole.LEAD
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('leadOrganizations', () => [IOrganization], {
    nullable: true,
    description: 'All Organizations that are leads in this Community.',
  })
  @Profiling.api
  async leadOrganizations(@Parent() community: Community) {
    return await this.communityService.getOrganizationsWithRole(
      community,
      CommunityRole.LEAD
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableLeadUsers', () => PaginatedUsers, {
    nullable: true,
    description:
      'All member users excluding the current lead users in this Community.',
  })
  @Profiling.api
  async availableLeadUsers(
    @Parent() community: Community,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const memberRoleCredentials =
      this.communityService.getCredentialDefinitionForRole(
        community,
        CommunityRole.MEMBER
      );

    const leadRoleCredential =
      this.communityService.getCredentialDefinitionForRole(
        community,
        CommunityRole.LEAD
      );

    const credentialCriteria = {
      member: memberRoleCredentials,
      lead: leadRoleCredential,
    };

    return this.userService.getPaginatedAvailableLeadUsers(
      credentialCriteria,
      pagination,
      filter
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: true,
    description: 'Application available for this community.',
  })
  @Profiling.api
  async applications(@Parent() community: Community) {
    const apps = await this.communityService.getApplications(community);
    return apps || [];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('communication', () => ICommunication, {
    nullable: true,
    description: 'The Communications for this Community.',
  })
  @Profiling.api
  async communication(@Parent() community: Community) {
    return await this.communityService.getCommunication(community.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('policy', () => ICommunityPolicy, {
    nullable: true,
    description: 'The policy that defines the roles for this Community.',
  })
  @Profiling.api
  async policy(@Parent() community: Community): Promise<ICommunityPolicy> {
    return this.communityService.getCommunityPolicy(community);
  }
}
