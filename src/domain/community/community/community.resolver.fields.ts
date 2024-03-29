import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver, Args, Float } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
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
import { PaginationInputOutOfBoundException } from '@common/exceptions';
import { UserService } from '../user/user.service';
import { UserFilterInput } from '@core/filtering';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { IForm } from '@domain/common/form/form.interface';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { AgentInfo } from '@core/authentication';
import { IInvitation } from '../invitation';
import { IInvitationExternal } from '../invitation.external';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';

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

    return await this.communityService.getUsersWithRole(
      community,
      CommunityRole.MEMBER,
      limit
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

    const parentCommunity = await this.communityService.getParentCommunity(
      community
    );

    const parentCommunityMemberCredentials = parentCommunity
      ? this.communityService.getCredentialDefinitionForRole(
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
    nullable: true,
    description: 'All users that have the specified Role in this Community.',
  })
  @Profiling.api
  async usersInRole(
    @Parent() community: Community,
    @Args('role', { type: () => CommunityRole, nullable: false })
    role: CommunityRole
  ) {
    return await this.communityService.getUsersWithRole(community, role);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('organizationsInRole', () => [IOrganization], {
    nullable: true,
    description:
      'All Organizations that have the specified Role in this Community.',
  })
  @Profiling.api
  async organizationsInRole(
    @Parent() community: Community,
    @Args('role', { type: () => CommunityRole, nullable: false })
    role: CommunityRole
  ): Promise<IOrganization[]> {
    return await this.communityService.getOrganizationsWithRole(
      community,
      role
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
  @ResolveField('invitations', () => [IInvitation], {
    nullable: true,
    description: 'Invitations for this community.',
  })
  @Profiling.api
  async inivitations(@Parent() community: Community): Promise<IInvitation[]> {
    return await this.communityService.getInvitations(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('invitationsExternal', () => [IInvitationExternal], {
    nullable: true,
    description:
      'Invitations to join this Community for users not yet on the Alkemio platform.',
  })
  @Profiling.api
  async invitationsExternal(
    @Parent() community: Community
  ): Promise<IInvitationExternal[]> {
    return await this.communityService.getExternalInvitations(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: true,
    description: 'Applications available for this community.',
  })
  @Profiling.api
  async applications(@Parent() community: Community) {
    const apps = await this.communityService.getApplications(community);
    return apps || [];
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('applicationForm', () => IForm, {
    nullable: true,
    description: 'The Form used for Applications to this community.',
  })
  @Profiling.api
  async applicationForm(@Parent() community: Community): Promise<IForm> {
    return await this.communityService.getApplicationForm(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('communication', () => ICommunication, {
    nullable: true,
    description: 'The Communications for this Community.',
  })
  @Profiling.api
  async communication(@Parent() community: Community) {
    return await this.communityService.getCommunication(community.id, {
      communication: { updates: true },
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('policy', () => ICommunityPolicy, {
    nullable: true,
    description: 'The policy that defines the roles for this Community.',
  })
  async policy(@Parent() community: Community): Promise<ICommunityPolicy> {
    return this.communityService.getCommunityPolicy(community);
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
    return this.communityService.getMembershipStatus(agentInfo, community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [CommunityRole], {
    nullable: true,
    description:
      'The roles on this community for the currently logged in user.',
  })
  async myRoles(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() community: ICommunity
  ): Promise<CommunityRole[]> {
    return this.communityService.getCommunityRoles(agentInfo, community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('guidelines', () => ICommunityGuidelines, {
    nullable: true,
    description: 'The guidelines for members of this Community.',
  })
  async guidelines(
    @Parent() community: ICommunity
  ): Promise<ICommunityGuidelines> {
    return await this.communityService.getCommunityGuidelines(community);
  }
}
