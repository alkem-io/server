import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
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

@Resolver(() => IRoleSet)
export class RoleSetResolverFields {
  constructor(
    private roleSetService: RoleSetService,
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
    @Parent() roleSet: IRoleSet,
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

    return await this.roleSetService.getUsersWithRole(
      roleSet,
      CommunityRoleType.MEMBER,
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
    @Parent() roleSet: IRoleSet,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const memberRoleCredentials =
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
      member: memberRoleCredentials,
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
  @ResolveField('usersInRole', () => [IUser], {
    nullable: false,
    description: 'All users that have the specified Role in this Community.',
  })
  @Profiling.api
  async usersInRole(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => CommunityRoleType, nullable: false })
    role: CommunityRoleType
  ) {
    return await this.roleSetService.getUsersWithRole(roleSet, role);
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
  @Profiling.api
  async virtualsInRole(
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
  @ResolveField('availableLeadUsers', () => PaginatedUsers, {
    nullable: false,
    description:
      'All member users excluding the current lead users in this Community.',
  })
  @Profiling.api
  async availableLeadUsers(
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
  @ResolveField('invitations', () => [IInvitation], {
    nullable: false,
    description: 'Invitations for this roleSet.',
  })
  @Profiling.api
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
  @Profiling.api
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
  @Profiling.api
  async applicationForm(@Parent() roleSet: RoleSet): Promise<IForm> {
    return await this.roleSetService.getApplicationForm(roleSet);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('roles', () => [IRole], {
    nullable: false,
    description: 'The Role Definitions included in this roleSet.',
  })
  @Profiling.api
  async roles(@Parent() roleSet: RoleSet): Promise<IRole[]> {
    return await this.roleSetService.getRoleDefinitions(roleSet);
  }
}