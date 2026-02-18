import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { ValidationException } from '@common/exceptions';
import { PaginationInputOutOfBoundException } from '@common/exceptions/pagination/pagination.input.out.of.bounds.exception';
import { GraphqlGuard } from '@core/authorization';
import { LicenseLoaderCreator } from '@core/dataloader/creators/loader.creators/license.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { UserFilterInput } from '@core/filtering/input-types/user.filter.input';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { PaginatedUsers } from '@core/pagination/paginated.user';
import { PaginatedVirtualContributor } from '@core/pagination/paginated.virtual.contributor';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { ILicense } from '@domain/common/license/license.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { UseGuards } from '@nestjs/common';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege } from '@src/common/decorators';
import { IApplication } from '../application/application.interface';
import { IInvitation } from '../invitation/invitation.interface';
import {
  IOrganizationsInRoles,
  IUsersInRoles,
  IVirtualContributorsInRoles,
} from './dto/role.set.contributors.in.roles.interfaces';
import { RoleSetRoleWithParentCredentials } from './dto/role.set.dto.role.with.parent.credentials';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';

@Resolver(() => IRoleSet)
export class RoleSetResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private userService: UserService,
    private virtualActorLookupService: VirtualActorLookupService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(
    'availableVirtualContributorsForEntryRole',
    () => PaginatedVirtualContributor,
    {
      nullable: false,
      description:
        'All available VirtualContributors that are eligible to invite to this RoleSet in the entry role.',
    }
  )
  async availableVirtualContributorsForEntryRole(
    @Parent() roleSet: IRoleSet,
    @Args({ nullable: true }) pagination: PaginationArgs
  ) {
    const entryRoleDefinition = await this.roleSetService.getRoleDefinition(
      roleSet,
      roleSet.entryRoleName
    );

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

    return this.virtualActorLookupService.getPaginatedAvailableEntryRoleVCs(
      roleSetEntryRoleCredential,
      pagination
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributorsInRole', () => [IVirtualContributor], {
    nullable: false,
    description:
      'All Virtual Contributors that have the specified Role in this Community.',
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField(
    'virtualContributorsInRoleInHierarchy',
    () => [IVirtualContributor],
    {
      nullable: false,
      description:
        'All Virtual Contributors that are available from the current or parent RoleSets.',
    }
  )
  async virtualContributorsInRoleInHierarchy(
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName
  ) {
    return await this.roleSetService.getVirtualContributorsInRoleInHierarchy(
      roleSet,
      role
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('invitations', () => [IInvitation], {
    nullable: false,
    description: 'Invitations for this roleSet.',
  })
  async inivitations(@Parent() roleSet: IRoleSet): Promise<IInvitation[]> {
    return await this.roleSetService.getInvitations(roleSet);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('applications', () => [IApplication], {
    nullable: false,
    description: 'Applications available for this RoleSet.',
  })
  async applications(@Parent() roleSet: IRoleSet) {
    const apps = await this.roleSetService.getApplications(roleSet);
    return apps || [];
  }

  @ResolveField('license', () => ILicense, {
    nullable: false,
    description: 'The License operating on this RoleSet.',
  })
  async license(
    @Parent() roleSet: IRoleSet,
    @Loader(LicenseLoaderCreator, {
      parentClassRef: RoleSet,
      checkParentPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(roleSet.id);
  }
}
