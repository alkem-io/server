import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
import { RoleSetService } from './role.set.service';
import { IRoleSet } from './role.set.interface';
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
import { RoleSetMemberCredentials } from '@domain/community/user/dto/user.dto.role.set.member.credentials';

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

    const parentRoleSet = await this.roleSetService.getParentRoleSet(roleSet);

    const parentRoleSetMemberCredential = parentRoleSet
      ? await this.roleSetService.getCredentialDefinitionForRole(
          parentRoleSet,
          CommunityRoleType.MEMBER
        )
      : undefined;

    const roleSetMemberCredential: RoleSetMemberCredentials = {
      member: roleDefinition,
      parentRoleSetMember: parentRoleSetMemberCredential,
    };

    return this.userService.getPaginatedAvailableMemberUsers(
      roleSetMemberCredential,
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
}
