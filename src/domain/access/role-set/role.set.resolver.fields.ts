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
import { RoleName } from '@common/enums/role.name';
import { UserService } from '@domain/community/user/user.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInvitation } from '../invitation/invitation.interface';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { RoleSetRoleWithParentCredentials } from './dto/role.set.dto.role.with.parent.credentials';
import { ILicense } from '@domain/common/license/license.interface';
import { RoleSet } from './role.set.entity';
import { LicenseLoaderCreator } from '@core/dataloader/creators/loader.creators/license.loader.creator';
import { ILoader } from '@core/dataloader/loader.interface';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import {
  IOrganizationsInRoles,
  IUsersInRoles,
  IVirtualContributorsInRoles,
} from './dto/role.set.contributors.in.roles.interfaces';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IPaginatedType } from '@core/pagination/paginated.type';

@Resolver(() => IRoleSet)
export class RoleSetResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private userService: UserService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableUsersForEntryRole', () => PaginatedUsers, {
    nullable: false,
    description:
      'All available users that are could join this RoleSet in the entry role.',
  })
  async availableUsersForEntryRole(
    @Parent() roleSet: IRoleSet,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const entryRoleDefinition = await this.roleSetService.getRoleDefinition(
      roleSet,
      roleSet.entryRoleName
    );

    // TODO: evaluated if this check is needed or not
    // if (!entryRoleDefinition.requiresSameRoleInParentRoleSet) {
    //   throw new ValidationException(
    //     `Role ${roleSet.entryRoleName} does not require the same role in parent RoleSet.`,
    //     LogContext.ROLES
    //   );
    // }

    const parentRoleSet = await this.roleSetService.getParentRoleSet(roleSet);

    const parentRoleSetEntryRoleCredential = parentRoleSet
      ? await this.roleSetService.getCredentialDefinitionForRole(
          parentRoleSet,
          roleSet.entryRoleName
        )
      : undefined;

    const roleSetEntryRoleCredential: RoleSetRoleWithParentCredentials = {
      role: entryRoleDefinition.credential,
      parentRoleSetRole: parentRoleSetEntryRoleCredential,
    };

    return this.userService.getPaginatedAvailableEntryRoleUsers(
      roleSetEntryRoleCredential,
      pagination,
      filter
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableUsersForElevatedRole', () => PaginatedUsers, {
    nullable: false,
    description:
      'All users that have the entryRole in the RoleSet, minus those already in the specified role.',
  })
  async availableUsersForElevatedRole(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => RoleName, nullable: false }) role: RoleName,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<IPaginatedType<IUser>> {
    const elevatedRoleDefinition = await this.roleSetService.getRoleDefinition(
      roleSet,
      role
    );
    if (!elevatedRoleDefinition.requiresEntryRole) {
      throw new ValidationException(
        `Role ${role} does not require an entry role.`,
        LogContext.ROLES
      );
    }
    const entryRoleCredential =
      await this.roleSetService.getCredentialDefinitionForRole(
        roleSet,
        roleSet.entryRoleName
      );

    const credentialCriteria = {
      entryRole: entryRoleCredential,
      elevatedRole: elevatedRoleDefinition.credential,
    };

    return this.userService.getPaginatedAvailableElevatedRoleUsers(
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
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName,
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
  @ResolveField('usersInRoles', () => [IUsersInRoles], {
    nullable: false,
    description:
      'All users that have a Role in this RoleSet in the specified Roles.',
  })
  async usersInRoles(
    @Parent() roleSet: IRoleSet,
    @Args('roles', { type: () => [RoleName], nullable: false })
    roles: RoleName[],
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The positive number of users to return per role; if omitted returns all users in the specified role.',
      nullable: true,
    })
    limit?: number
  ): Promise<IUsersInRoles[]> {
    if (limit && limit < 0) {
      throw new PaginationInputOutOfBoundException(
        `Limit expects a positive amount: ${limit} provided instead`
      );
    }
    return Promise.all(
      roles.map(async role => ({
        role,
        users: await this.roleSetService.getUsersWithRole(roleSet, role, limit),
      }))
    );
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
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName
  ): Promise<IOrganization[]> {
    return await this.roleSetService.getOrganizationsWithRole(roleSet, role);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('organizationsInRoles', () => [IOrganizationsInRoles], {
    nullable: false,
    description:
      'All organizations that have a role in this RoleSet in the specified Roles.',
  })
  async organizationsInRoles(
    @Parent() roleSet: IRoleSet,
    @Args('roles', { type: () => [RoleName], nullable: false })
    roles: RoleName[]
  ): Promise<IOrganizationsInRoles[]> {
    return Promise.all(
      roles.map(async role => ({
        role,
        organizations: await this.roleSetService.getOrganizationsWithRole(
          roleSet,
          role
        ),
      }))
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributorsInRole', () => [IVirtualContributor], {
    nullable: false,
    description: 'All virtuals that have the specified Role in this Community.',
  })
  async virtualContributorsInRole(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName
  ) {
    return await this.roleSetService.getVirtualContributorsWithRole(
      roleSet,
      role
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(
    'virtualContributorsInRoles',
    () => [IVirtualContributorsInRoles],
    {
      nullable: false,
      description:
        'All VirtualContributors that have a role in this RoleSet in the specified Roles.',
    }
  )
  async virtualContributorsInRoles(
    @Parent() roleSet: IRoleSet,
    @Args('roles', { type: () => [RoleName], nullable: false })
    roles: RoleName[]
  ): Promise<IVirtualContributorsInRoles[]> {
    return Promise.all(
      roles.map(async role => ({
        role,
        virtualContributors:
          await this.roleSetService.getVirtualContributorsWithRole(
            roleSet,
            role
          ),
      }))
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
      'Invitations to join this RoleSet in an entry role for users not yet on the Alkemio platform.',
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
    description: 'Applications available for this RoleSet.',
  })
  async applications(@Parent() roleSet: IRoleSet) {
    const apps = await this.roleSetService.getApplications(roleSet);
    return apps || [];
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('license', () => ILicense, {
    nullable: false,
    description: 'The License operating on this RoleSet.',
  })
  async license(
    @Parent() roleSet: IRoleSet,
    @Loader(LicenseLoaderCreator, { parentClassRef: RoleSet })
    loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(roleSet.id);
  }
}
