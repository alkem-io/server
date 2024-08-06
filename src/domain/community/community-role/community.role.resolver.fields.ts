import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver, Args, Float } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { IUser } from '@domain/community/user';
import { IApplication } from '@domain/community/application';
import { AuthorizationPrivilege } from '@common/enums';
import { IOrganization } from '../organization';
import { CommunityRole } from '@common/enums/community.role';
import { PaginationArgs, PaginatedUsers } from '@core/pagination';
import { PaginationInputOutOfBoundException } from '@common/exceptions';
import { UserService } from '../user/user.service';
import { UserFilterInput } from '@core/filtering';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IInvitation } from '../invitation';
import { IVirtualContributor } from '../virtual-contributor/virtual.contributor.interface';
import { CommunityRoleImplicit } from '@common/enums/community.role.implicit';
import { IPlatformInvitation } from '@platform/invitation';
import { CommunityRoleService } from './community.role.service';
import { CommunityService } from '../community/community.service';

@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(
    private communityRoleService: CommunityRoleService,
    private communityService: CommunityService,
    private userService: UserService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('memberUsers', () => [IUser], {
    nullable: false,
    description: 'All users that are contributing to this Community.',
  })
  @Profiling.api
  async memberUsers(
    @Parent() community: Community,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The positive number of member users to return; if omitted returns all member users.',
      nullable: true,
    })
    limit?: number
  ) {
    if (limit && limit < 0) {
      throw new PaginationInputOutOfBoundException(
        `Limit expects a positive amount: ${limit} provided instead`
      );
    }

    return await this.communityRoleService.getUsersWithRole(
      community,
      CommunityRole.MEMBER,
      limit
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableMemberUsers', () => PaginatedUsers, {
    nullable: false,
    description: 'All available users that are potential Community members.',
  })
  @Profiling.api
  async availableMemberUsers(
    @Parent() community: Community,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const memberRoleCredentials =
      this.communityRoleService.getCredentialDefinitionForRole(
        community,
        CommunityRole.MEMBER
      );

    const parentCommunity =
      await this.communityService.getParentCommunity(community);

    const parentCommunityMemberCredentials = parentCommunity
      ? this.communityRoleService.getCredentialDefinitionForRole(
          parentCommunity,
          CommunityRole.MEMBER
        )
      : undefined;

    const communityMemberCredentials = {
      member: memberRoleCredentials,
      parentCommunityMember: parentCommunityMemberCredentials,
    };

    return this.userService.getPaginatedAvailableMemberUsers(
      communityMemberCredentials,
      pagination,
      filter
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('usersInRole', () => [IUser], {
    nullable: false,
    description: 'All users that have the specified Role in this Community.',
  })
  @Profiling.api
  async usersInRole(
    @Parent() community: Community,
    @Args('role', { type: () => CommunityRole, nullable: false })
    role: CommunityRole
  ) {
    return await this.communityRoleService.getUsersWithRole(community, role);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('organizationsInRole', () => [IOrganization], {
    nullable: false,
    description:
      'All Organizations that have the specified Role in this Community.',
  })
  @Profiling.api
  async organizationsInRole(
    @Parent() community: Community,
    @Args('role', { type: () => CommunityRole, nullable: false })
    role: CommunityRole
  ): Promise<IOrganization[]> {
    return await this.communityRoleService.getOrganizationsWithRole(
      community,
      role
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributorsInRole', () => [IVirtualContributor], {
    nullable: false,
    description: 'All virtuals that have the specified Role in this Community.',
  })
  @Profiling.api
  async virtualsInRole(
    @Parent() community: Community,
    @Args('role', { type: () => CommunityRole, nullable: false })
    role: CommunityRole
  ) {
    return await this.communityRoleService.getVirtualContributorsWithRole(
      community,
      role
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableLeadUsers', () => PaginatedUsers, {
    nullable: false,
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
      this.communityRoleService.getCredentialDefinitionForRole(
        community,
        CommunityRole.MEMBER
      );

    const leadRoleCredential =
      this.communityRoleService.getCredentialDefinitionForRole(
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
  @ResolveField('invitations', () => [IInvitation], {
    nullable: false,
    description: 'Invitations for this community.',
  })
  @Profiling.api
  async inivitations(@Parent() community: Community): Promise<IInvitation[]> {
    return await this.communityRoleService.getInvitations(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('platformInvitations', () => [IPlatformInvitation], {
    nullable: false,
    description:
      'Invitations to join this Community for users not yet on the Alkemio platform.',
  })
  @Profiling.api
  async platformInvitations(
    @Parent() community: Community
  ): Promise<IPlatformInvitation[]> {
    return await this.communityRoleService.getPlatformInvitations(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: false,
    description: 'Applications available for this community.',
  })
  @Profiling.api
  async applications(@Parent() community: Community) {
    const apps = await this.communityRoleService.getApplications(community);
    return apps || [];
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityMembershipStatus> {
    return this.communityRoleService.getMembershipStatus(agentInfo, community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [CommunityRole], {
    nullable: false,
    description:
      'The roles on this community for the currently logged in user.',
  })
  async myRoles(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityRole[]> {
    return this.communityRoleService.getCommunityRoles(agentInfo, community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRolesImplicit', () => [CommunityRoleImplicit], {
    nullable: false,
    description:
      'The implicit roles on this community for the currently logged in user.',
  })
  async myRolesImplicit(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityRoleImplicit[]> {
    return this.communityRoleService.getCommunityImplicitRoles(
      agentInfo,
      community
    );
  }
}
