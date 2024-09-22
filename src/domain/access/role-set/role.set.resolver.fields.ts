import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { RoleSetService } from './role.set.service';
import { IForm } from '@domain/common/form/form.interface';
import { IRoleSet } from './role.set.interface';
import { RoleSet } from './role.set.entity';
import { IApplication } from '../application/application.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UserFilterInput } from '@core/filtering/input-types/user.filter.input';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { PaginatedUsers } from '@core/pagination/paginated.user';
import { PaginationInputOutOfBoundException } from '@common/exceptions/pagination/pagination.input.out.of.bounds.exception';
import { IUser } from '@domain/community/user/user.interface';
import { CommunityRoleType } from '@common/enums/community.role';
import { UserService } from '@domain/community/user/user.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInvitation } from '../invitation/invitation.interface';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { IRole } from '../role/role.interface';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CommunityRoleImplicit } from '@common/enums/community.role.implicit';

@Resolver(() => IRoleSet)
export class RoleSetResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private userService: UserService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableUsersForMemberRole', () => PaginatedUsers, {
    nullable: false,
    description: 'All available users that are potential Community members.',
  })
  async availableUsersForMemberRole(
    @Parent() roleSet: IRoleSet,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const roleDefinition =
      await this.roleSetService.getCredentialDefinitionForRole(
        roleSet,
        CommunityRoleType.MEMBER
      );

    const parentCommunity = await this.roleSetService.getParentRoleSet(roleSet);

    const parentCommunityMemberCredentials = parentCommunity
      ? await this.roleSetService.getCredentialDefinitionForRole(
          parentCommunity,
          CommunityRoleType.MEMBER
        )
      : undefined;

    const roleSetMemberCredentials = {
      member: roleDefinition,
      parentCommunityMember: parentCommunityMemberCredentials,
    };

    return this.userService.getPaginatedAvailableMemberUsers(
      roleSetMemberCredentials,
      pagination,
      filter
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableUsersForLeadRole', () => PaginatedUsers, {
    nullable: false,
    description:
      'All  users excluding the current lead users in this Community.',
  })
  async availableUsersForLeadRole(
    @Parent() roleSet: IRoleSet,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const memberRoleCredentials =
      await this.roleSetService.getCredentialDefinitionForRole(
        roleSet,
        CommunityRoleType.MEMBER
      );

    const leadRoleCredential =
      await this.roleSetService.getCredentialDefinitionForRole(
        roleSet,
        CommunityRoleType.LEAD
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
  @ResolveField('usersInRole', () => [IUser], {
    nullable: false,
    description:
      'All users that are contributing to this Community in the specified Role.',
  })
  async usersInRole(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => CommunityRoleType, nullable: false })
    role: CommunityRoleType,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The positive number of users to return; if omitted returns all users in the specified role.',
      nullable: true,
    })
    limit?: number
  ): Promise<IUser[]> {
    if (limit && limit < 0) {
      throw new PaginationInputOutOfBoundException(
        `Limit expects a positive amount: ${limit} provided instead`
      );
    }

    return await this.roleSetService.getUsersWithRole(roleSet, role, limit);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('organizationsInRole', () => [IOrganization], {
    nullable: false,
    description:
      'All Organizations that have the specified Role in this Community.',
  })
  async organizationsInRole(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => CommunityRoleType, nullable: false })
    role: CommunityRoleType
  ): Promise<IOrganization[]> {
    return await this.roleSetService.getOrganizationsWithRole(roleSet, role);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributorsInRole', () => [IVirtualContributor], {
    nullable: false,
    description: 'All virtuals that have the specified Role in this Community.',
  })
  async virtualContributorsInRole(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => CommunityRoleType, nullable: false })
    role: CommunityRoleType
  ) {
    return await this.roleSetService.getVirtualContributorsWithRole(
      roleSet,
      role
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('invitations', () => [IInvitation], {
    nullable: false,
    description: 'Invitations for this roleSet.',
  })
  async inivitations(@Parent() roleSet: IRoleSet): Promise<IInvitation[]> {
    return await this.roleSetService.getInvitations(roleSet);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('platformInvitations', () => [IPlatformInvitation], {
    nullable: false,
    description:
      'Invitations to join this Community for users not yet on the Alkemio platform.',
  })
  async platformInvitations(
    @Parent() roleSet: IRoleSet
  ): Promise<IPlatformInvitation[]> {
    return await this.roleSetService.getPlatformInvitations(roleSet);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: false,
    description: 'Applications available for this roleSet.',
  })
  async applications(@Parent() roleSet: IRoleSet) {
    const apps = await this.roleSetService.getApplications(roleSet);
    return apps || [];
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('applicationForm', () => IForm, {
    nullable: false,
    description: 'The Form used for Applications to this roleSet.',
  })
  async applicationForm(@Parent() roleSet: RoleSet): Promise<IForm> {
    return await this.roleSetService.getApplicationForm(roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('roleDefinitions', () => [IRole], {
    nullable: false,
    description: 'The Role Definitions included in this roleSet.',
  })
  async roleDefinitions(@Parent() roleSet: RoleSet): Promise<IRole[]> {
    return await this.roleSetService.getRoleDefinitions(roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('roleDefinition', () => IRole, {
    nullable: false,
    description: 'The Role Definitions from this RoleSet to return.',
  })
  async roleDefinition(
    @Parent() roleSet: RoleSet,
    @Args('role', { type: () => CommunityRoleType, nullable: false })
    role: CommunityRoleType
  ): Promise<IRole> {
    return await this.roleSetService.getRoleDefinition(roleSet, role);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roleSet: IRoleSet
  ): Promise<CommunityMembershipStatus> {
    return this.roleSetService.getMembershipStatus(agentInfo, roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [CommunityRoleType], {
    nullable: false,
    description:
      'The roles on this community for the currently logged in user.',
  })
  async myRoles(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roleSet: IRoleSet
  ): Promise<CommunityRoleType[]> {
    return this.roleSetService.getRolesForAgentInfo(agentInfo, roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRolesImplicit', () => [CommunityRoleImplicit], {
    nullable: false,
    description:
      'The implicit roles on this community for the currently logged in user.',
  })
  async myRolesImplicit(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() roleSet: IRoleSet
  ): Promise<CommunityRoleImplicit[]> {
    return this.roleSetService.getCommunityImplicitRoles(agentInfo, roleSet);
  }
}
