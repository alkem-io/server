import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { PaginationInputOutOfBoundException } from '@common/exceptions/pagination/pagination.input.out.of.bounds.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
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
import {
  AuthorizationActorHasPrivilege,
  CurrentActor,
} from '@src/common/decorators';
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

// 027-platform-role-redesign (T051, A20/A20b, D9): the 9 `Platform …` and 3
// `Feature …` TARGET roles this feature introduces — explicit sets, not a
// `platform-`/`feature-` string-prefix test. A prefix test would also catch
// the pre-existing legacy roles that happen to share the "platform-"
// string (platform-operations-admin, platform-beta-tester,
// platform-vc-campaign, platform-assistant-access), silently re-gating
// their holder-list reads onto a privilege they never needed — exactly the
// kind of narrowing Slice A forbids.
const PLATFORM_TARGET_ROLES: ReadonlySet<RoleName> = new Set([
  RoleName.PLATFORM_ROLES_ADMIN,
  RoleName.PLATFORM_CONTENT_FULL_ACCESS,
  RoleName.PLATFORM_RESOURCE_ADMIN,
  RoleName.PLATFORM_SETTINGS_ADMIN,
  RoleName.PLATFORM_USERS_ADMIN,
  RoleName.PLATFORM_SUPPORT,
  RoleName.PLATFORM_LICENSE_MANAGER,
  RoleName.PLATFORM_SPACES_READER,
  RoleName.PLATFORM_AUDIT_READER,
]);
const FEATURE_TARGET_ROLES: ReadonlySet<RoleName> = new Set([
  RoleName.FEATURE_BETA_TESTER,
  RoleName.FEATURE_VIRTUAL_ASSISTANT,
  RoleName.FEATURE_ORGANIZATION_CREATOR,
]);

@Resolver(() => IRoleSet)
export class RoleSetResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private userService: UserService,
    private virtualActorLookupService: VirtualActorLookupService,
    private authorizationService: AuthorizationService
  ) {}

  // 027-platform-role-redesign (T051, A20/A20b, D9, sixth clarification
  // pass): privilege is selected per requested ROLE, not per role-set —
  // non-platform/feature role-sets and roles keep plain READ (FR-032:
  // per-space and organization holder lists MUST be unchanged); a
  // `platform-*` TARGET role requires PLATFORM_ROLE_HOLDERS_READ; a
  // `feature-*` TARGET role requires PLATFORM_ROLE_HOLDERS_READ **or**
  // FEATURE_ROLE_HOLDERS_READ (which is what lets a Platform Users Admin
  // see whom to revoke a Feature role from, FR-003 + FR-032).
  private checkHolderListAccessOrFail(
    actorContext: ActorContext,
    roleSet: IRoleSet,
    role: RoleName,
    fieldName: string
  ): void {
    if (PLATFORM_TARGET_ROLES.has(role)) {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        roleSet.authorization,
        AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ,
        `${fieldName}: role ${role}`
      );
      return;
    }
    if (FEATURE_TARGET_ROLES.has(role)) {
      const viaRolesAdmin = this.authorizationService.isAccessGranted(
        actorContext,
        roleSet.authorization,
        AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
      );
      const viaFeatureAdmin = this.authorizationService.isAccessGranted(
        actorContext,
        roleSet.authorization,
        AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
      );
      if (!viaRolesAdmin && !viaFeatureAdmin) {
        throw new ForbiddenException(
          `PLATFORM_ROLE_HOLDERS_READ or FEATURE_ROLE_HOLDERS_READ required to read holders of role: ${role}`,
          LogContext.AUTH_POLICY
        );
      }
      return;
    }
    // Ordinary (non-target) role, e.g. every per-space/organization role,
    // and the legacy platform-* roles this feature does not touch — behaviour
    // unchanged (FR-032).
    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.READ,
      `${fieldName}: role ${role}`
    );
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('availableUsersForEntryRole', () => PaginatedUsers, {
    nullable: false,
    description:
      'All available users that are could join this RoleSet in the entry role.',
  })
  async availableUsersForEntryRole(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roleSet: IRoleSet,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ) {
    const entryRoleDefinition = await this.roleSetService.getRoleDefinition(
      roleSet,
      roleSet.entryRoleName
    );

    const parentRoleSet = await this.roleSetService.getParentRoleSet(roleSet);

    // For a subspace the candidate pool is normally restricted to members of the
    // parent RoleSet, because subspace membership requires parent membership.
    // However, if the caller is authorized to invite into the parent RoleSet
    // (parent/Space admins always are; subspace admins only when the parent Space
    // has `allowSubspaceAdminsToInviteMembers` enabled) then inviting a
    // non-member also pulls them into the parent, so the full platform user list
    // becomes available. Current members of this RoleSet are excluded regardless
    // (handled downstream in getPaginatedAvailableEntryRoleUsers).
    let restrictToParentMembers = false;
    if (parentRoleSet) {
      const parentRoleSetWithAuthorization =
        await this.roleSetService.getRoleSetOrFail(parentRoleSet.id, {
          relations: { authorization: true },
        });
      const authorizedToInviteToParent =
        this.authorizationService.isAccessGranted(
          actorContext,
          parentRoleSetWithAuthorization.authorization,
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE
        );
      restrictToParentMembers = !authorizedToInviteToParent;
    }

    const parentRoleSetEntryRoleCredential =
      parentRoleSet && restrictToParentMembers
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  // 027-platform-role-redesign (T051): no static @AuthorizationActorHasPrivilege
  // — the privilege depends on the requested `role` argument, checked
  // in-method via checkHolderListAccessOrFail. @UseGuards(GraphqlGuard)
  // stays a no-op guard here (it only acts when privilege metadata is
  // present) but is kept for consistency with the sibling fields.
  @UseGuards(GraphqlGuard)
  @ResolveField('usersInRole', () => [IUser], {
    nullable: false,
    description:
      'All users that are contributing to this Community in the specified Role.',
  })
  async usersInRole(
    @CurrentActor() actorContext: ActorContext,
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
    this.checkHolderListAccessOrFail(
      actorContext,
      roleSet,
      role,
      'usersInRole'
    );

    return await this.roleSetService.getUsersWithRole(roleSet, role, limit);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('usersInRoles', () => [IUsersInRoles], {
    nullable: false,
    description:
      'All users that have a Role in this RoleSet in the specified Roles.',
  })
  async usersInRoles(
    @CurrentActor() actorContext: ActorContext,
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
    // 027-platform-role-redesign (T051a): fail closed AS A WHOLE — every
    // requested role is checked BEFORE any data is fetched. A partial
    // result (silently dropping the denied role) would make a withheld
    // role indistinguishable from an empty one — the read-side twin of the
    // C1 silent-void defect this feature closes elsewhere.
    for (const role of roles) {
      this.checkHolderListAccessOrFail(
        actorContext,
        roleSet,
        role,
        'usersInRoles'
      );
    }
    return Promise.all(
      roles.map(async role => ({
        role,
        users: await this.roleSetService.getUsersWithRole(roleSet, role, limit),
      }))
    );
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('organizationsInRole', () => [IOrganization], {
    nullable: false,
    description:
      'All Organizations that have the specified Role in this Community.',
  })
  async organizationsInRole(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roleSet: IRoleSet,
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName
  ): Promise<IOrganization[]> {
    this.checkHolderListAccessOrFail(
      actorContext,
      roleSet,
      role,
      'organizationsInRole'
    );
    return await this.roleSetService.getOrganizationsWithRole(roleSet, role);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('organizationsInRoles', () => [IOrganizationsInRoles], {
    nullable: false,
    description:
      'All organizations that have a role in this RoleSet in the specified Roles.',
  })
  async organizationsInRoles(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roleSet: IRoleSet,
    @Args('roles', { type: () => [RoleName], nullable: false })
    roles: RoleName[]
  ): Promise<IOrganizationsInRoles[]> {
    // 027-platform-role-redesign (T051a): fail closed as a whole — see
    // usersInRoles above.
    for (const role of roles) {
      this.checkHolderListAccessOrFail(
        actorContext,
        roleSet,
        role,
        'organizationsInRoles'
      );
    }
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('invitations', () => [IInvitation], {
    nullable: false,
    description: 'Invitations for this roleSet.',
  })
  async inivitations(@Parent() roleSet: IRoleSet): Promise<IInvitation[]> {
    return await this.roleSetService.getInvitations(roleSet);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
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
