import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import { ValidationException } from '@common/exceptions';
import { PaginationInputOutOfBoundException } from '@common/exceptions/pagination/pagination.input.out.of.bounds.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetResolverFields } from './role.set.resolver.fields';
import { RoleSetService } from './role.set.service';

describe('RoleSetResolverFields', () => {
  let resolver: RoleSetResolverFields;
  let roleSetService: RoleSetService;
  let userService: UserService;
  let virtualActorLookupService: VirtualActorLookupService;
  let authorizationService: AuthorizationService;

  const mockActorContext = { actorID: 'actor-1', credentials: [] } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleSetResolverFields, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<RoleSetResolverFields>(RoleSetResolverFields);
    roleSetService = module.get<RoleSetService>(RoleSetService);
    userService = module.get<UserService>(UserService);
    virtualActorLookupService = module.get<VirtualActorLookupService>(
      VirtualActorLookupService
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('availableUsersForEntryRole', () => {
    it('should get paginated available entry role users', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        entryRoleName: RoleName.MEMBER,
      } as any;
      const mockRoleDefinition = {
        credential: { type: 'space-member', resourceID: 'res-1' },
      };
      const mockPagination = { first: 10 } as any;
      const mockResult = { items: [], pageInfo: {} } as any;

      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(
        mockRoleDefinition
      );
      (roleSetService.getParentRoleSet as Mock).mockResolvedValue(undefined);
      (
        userService.getPaginatedAvailableEntryRoleUsers as Mock
      ).mockResolvedValue(mockResult);

      const result = await resolver.availableUsersForEntryRole(
        mockActorContext,
        mockRoleSet,
        mockPagination
      );

      expect(result).toBe(mockResult);
      expect(
        userService.getPaginatedAvailableEntryRoleUsers
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          role: mockRoleDefinition.credential,
          parentRoleSetRole: undefined,
        }),
        mockPagination,
        undefined
      );
    });

    it('should restrict to parent members when caller cannot invite to the parent role set', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        entryRoleName: RoleName.MEMBER,
      } as any;
      const mockRoleDefinition = {
        credential: { type: 'space-member', resourceID: 'res-1' },
      };
      const parentRoleSet = { id: 'parent-rs' } as any;
      const parentCredential = {
        type: 'space-member',
        resourceID: 'parent-res',
      };

      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(
        mockRoleDefinition
      );
      (roleSetService.getParentRoleSet as Mock).mockResolvedValue(
        parentRoleSet
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue({
        id: 'parent-rs',
        authorization: { id: 'auth-parent' },
      });
      // Caller is NOT authorized to invite into the parent RoleSet
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);
      (roleSetService.getCredentialDefinitionForRole as Mock).mockResolvedValue(
        parentCredential
      );
      (
        userService.getPaginatedAvailableEntryRoleUsers as Mock
      ).mockResolvedValue({ items: [] });

      await resolver.availableUsersForEntryRole(
        mockActorContext,
        mockRoleSet,
        {} as any
      );

      expect(
        userService.getPaginatedAvailableEntryRoleUsers
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          parentRoleSetRole: parentCredential,
        }),
        expect.anything(),
        undefined
      );
    });

    it('should expose the full platform list when caller can invite to the parent role set', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        entryRoleName: RoleName.MEMBER,
      } as any;
      const mockRoleDefinition = {
        credential: { type: 'space-member', resourceID: 'res-1' },
      };
      const parentRoleSet = { id: 'parent-rs' } as any;

      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(
        mockRoleDefinition
      );
      (roleSetService.getParentRoleSet as Mock).mockResolvedValue(
        parentRoleSet
      );
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue({
        id: 'parent-rs',
        authorization: { id: 'auth-parent' },
      });
      // Caller IS authorized to invite into the parent RoleSet
      (authorizationService.isAccessGranted as Mock).mockReturnValue(true);
      (
        userService.getPaginatedAvailableEntryRoleUsers as Mock
      ).mockResolvedValue({ items: [] });

      await resolver.availableUsersForEntryRole(
        mockActorContext,
        mockRoleSet,
        {} as any
      );

      // No parent restriction => full platform list (current members still
      // excluded downstream in the user service).
      expect(
        userService.getPaginatedAvailableEntryRoleUsers
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          parentRoleSetRole: undefined,
        }),
        expect.anything(),
        undefined
      );
      expect(
        roleSetService.getCredentialDefinitionForRole
      ).not.toHaveBeenCalled();
    });
  });

  describe('availableVirtualContributorsForEntryRole', () => {
    it('should get paginated available VCs for entry role', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        entryRoleName: RoleName.MEMBER,
      } as any;
      const mockRoleDefinition = {
        credential: { type: 'space-member', resourceID: 'res-1' },
      };
      const mockResult = { items: [] } as any;

      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(
        mockRoleDefinition
      );
      (roleSetService.getParentRoleSet as Mock).mockResolvedValue(undefined);
      (
        virtualActorLookupService.getPaginatedAvailableEntryRoleVCs as Mock
      ).mockResolvedValue(mockResult);

      const result = await resolver.availableVirtualContributorsForEntryRole(
        mockRoleSet,
        {} as any
      );

      expect(result).toBe(mockResult);
    });
  });

  describe('availableUsersForElevatedRole', () => {
    it('should get users for elevated role when requiresEntryRole is true', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        entryRoleName: RoleName.MEMBER,
      } as any;
      const entryCredential = {
        type: 'space-member',
        resourceID: 'res-1',
      };
      const elevatedRoleDef = {
        requiresEntryRole: true,
        credential: { type: 'space-lead', resourceID: 'res-1' },
      };

      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(
        elevatedRoleDef
      );
      (roleSetService.getCredentialDefinitionForRole as Mock).mockResolvedValue(
        entryCredential
      );
      (
        userService.getPaginatedAvailableElevatedRoleUsers as Mock
      ).mockResolvedValue({ items: [] });

      await resolver.availableUsersForElevatedRole(
        mockRoleSet,
        RoleName.LEAD,
        {} as any
      );

      expect(
        userService.getPaginatedAvailableElevatedRoleUsers
      ).toHaveBeenCalled();
    });

    it('should throw when role does not require entry role', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        entryRoleName: RoleName.MEMBER,
      } as any;
      const elevatedRoleDef = {
        requiresEntryRole: false,
        credential: { type: 'space-lead', resourceID: 'res-1' },
      };

      (roleSetService.getRoleDefinition as Mock).mockResolvedValue(
        elevatedRoleDef
      );

      await expect(
        resolver.availableUsersForElevatedRole(
          mockRoleSet,
          RoleName.LEAD,
          {} as any
        )
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('usersInRole', () => {
    it('should delegate to roleSetService.getUsersWithRole', async () => {
      const mockUsers = [{ id: 'user-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getUsersWithRole as Mock).mockResolvedValue(mockUsers);

      const result = await resolver.usersInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(result).toEqual(mockUsers);
      expect(roleSetService.getUsersWithRole).toHaveBeenCalledWith(
        mockRoleSet,
        RoleName.MEMBER,
        undefined
      );
    });

    it('should pass limit to service', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      (roleSetService.getUsersWithRole as Mock).mockResolvedValue([]);

      await resolver.usersInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.MEMBER,
        5
      );

      expect(roleSetService.getUsersWithRole).toHaveBeenCalledWith(
        mockRoleSet,
        RoleName.MEMBER,
        5
      );
    });

    it('should throw when limit is negative', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;

      await expect(
        resolver.usersInRole(mockActorContext, mockRoleSet, RoleName.MEMBER, -1)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });

    // 027-platform-role-redesign (T051, A20): a `platform-*` TARGET role
    // requires PLATFORM_ROLE_HOLDERS_READ, not plain READ.
    it('should deny a platform-* target role without PLATFORM_ROLE_HOLDERS_READ', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      // spec-server-6 fix: an explicit `isAccessGranted` + throw now
      // enforces this, not a `grantAccessOrFail` delegation.
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.usersInRole(
          mockActorContext,
          mockRoleSet,
          RoleName.PLATFORM_ROLES_ADMIN
        )
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${RoleName.PLATFORM_ROLES_ADMIN}`
      );
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
      );
    });

    // 027-platform-role-redesign (T051, A20b, D9): a `feature-*` TARGET role
    // is reachable via FEATURE_ROLE_HOLDERS_READ alone, even when
    // PLATFORM_ROLE_HOLDERS_READ is denied — this is what lets a Platform
    // Users Admin see whom to revoke a Feature role from.
    it('should allow a feature-* target role via FEATURE_ROLE_HOLDERS_READ alone', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      const mockUsers = [{ id: 'user-1' }] as any[];
      (roleSetService.getUsersWithRole as Mock).mockResolvedValue(mockUsers);
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_actor, _auth, privilege) =>
          privilege === AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
      );

      const result = await resolver.usersInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.FEATURE_BETA_TESTER
      );

      expect(result).toEqual(mockUsers);
    });

    // Neither PLATFORM_ROLE_HOLDERS_READ nor FEATURE_ROLE_HOLDERS_READ.
    it('should deny a feature-* target role when neither holder-read privilege is held', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.usersInRole(
          mockActorContext,
          mockRoleSet,
          RoleName.FEATURE_BETA_TESTER
        )
      ).rejects.toThrow();
      expect(roleSetService.getUsersWithRole).not.toHaveBeenCalled();
    });

    // 027-platform-role-redesign (T051, FR-032, T070f): a NON-target role —
    // every per-space/organization role, and the legacy platform-* roles
    // this feature does not touch — keeps plain READ. A role-set-WIDE check
    // would re-create the grant-but-never-revoke bug the sixth
    // clarification pass closed.
    it('should gate a non-target (ordinary) role on plain READ, not either holder-read privilege', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      (roleSetService.getUsersWithRole as Mock).mockResolvedValue([]);

      await resolver.usersInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
      expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
    });
  });

  describe('usersInRoles', () => {
    it('should return users grouped by role', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockUsers = [{ id: 'user-1' }] as any[];

      (roleSetService.getUsersWithRole as Mock).mockResolvedValue(mockUsers);

      const result = await resolver.usersInRoles(
        mockActorContext,
        mockRoleSet,
        [RoleName.MEMBER, RoleName.LEAD]
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: RoleName.MEMBER,
        users: mockUsers,
      });
      expect(result[1]).toEqual({
        role: RoleName.LEAD,
        users: mockUsers,
      });
    });

    it('should throw when limit is negative', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;

      await expect(
        resolver.usersInRoles(
          mockActorContext,
          mockRoleSet,
          [RoleName.MEMBER],
          -1
        )
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });

    // 027-platform-role-redesign (T051a): fail closed AS A WHOLE — a
    // request naming a plain role AND a denied target role must be
    // rejected entirely, before any data is fetched for either role.
    it('should deny the whole request and return zero rows when any requested role is denied', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      // MEMBER is an ordinary (non-target) role — still gated via
      // `grantAccessOrFail`. PLATFORM_ROLES_ADMIN is a platform-target role
      // — gated via `isAccessGranted` (spec-server-6 fix).
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(true);
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_actor, _auth, privilege) =>
          privilege !== AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
      );

      await expect(
        resolver.usersInRoles(mockActorContext, mockRoleSet, [
          RoleName.MEMBER,
          RoleName.PLATFORM_ROLES_ADMIN,
        ])
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${RoleName.PLATFORM_ROLES_ADMIN}`
      );
      expect(roleSetService.getUsersWithRole).not.toHaveBeenCalled();
    });
  });

  describe('organizationsInRole', () => {
    it('should delegate to roleSetService.getOrganizationsWithRole', async () => {
      const mockOrgs = [{ id: 'org-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getOrganizationsWithRole as Mock).mockResolvedValue(
        mockOrgs
      );

      const result = await resolver.organizationsInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(result).toEqual(mockOrgs);
    });

    // 027-platform-role-redesign (T051, A20, T070f): same per-requested-role
    // privilege selection as usersInRole — organizationsInRole shares
    // checkHolderListAccessOrFail, but had no target-role coverage of its own.
    it('should deny a platform-* target role without PLATFORM_ROLE_HOLDERS_READ', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      // spec-server-6 fix: an explicit `isAccessGranted` + throw now
      // enforces this, not a `grantAccessOrFail` delegation.
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.organizationsInRole(
          mockActorContext,
          mockRoleSet,
          RoleName.PLATFORM_ROLES_ADMIN
        )
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${RoleName.PLATFORM_ROLES_ADMIN}`
      );
      expect(roleSetService.getOrganizationsWithRole).not.toHaveBeenCalled();
    });

    it('should allow a feature-* target role via FEATURE_ROLE_HOLDERS_READ alone', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      const mockOrgs = [{ id: 'org-1' }] as any[];
      (roleSetService.getOrganizationsWithRole as Mock).mockResolvedValue(
        mockOrgs
      );
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_actor, _auth, privilege) =>
          privilege === AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
      );

      const result = await resolver.organizationsInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.FEATURE_ORGANIZATION_CREATOR
      );

      expect(result).toEqual(mockOrgs);
    });

    it('should deny a feature-* target role when neither holder-read privilege is held', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      (authorizationService.isAccessGranted as Mock).mockReturnValue(false);

      await expect(
        resolver.organizationsInRole(
          mockActorContext,
          mockRoleSet,
          RoleName.FEATURE_ORGANIZATION_CREATOR
        )
      ).rejects.toThrow();
      expect(roleSetService.getOrganizationsWithRole).not.toHaveBeenCalled();
    });

    it('should gate a non-target (ordinary) role on plain READ', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      (roleSetService.getOrganizationsWithRole as Mock).mockResolvedValue([]);

      await resolver.organizationsInRole(
        mockActorContext,
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        mockActorContext,
        mockRoleSet.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
    });
  });

  describe('organizationsInRoles', () => {
    it('should return organizations grouped by role', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockOrgs = [{ id: 'org-1' }] as any[];

      (roleSetService.getOrganizationsWithRole as Mock).mockResolvedValue(
        mockOrgs
      );

      const result = await resolver.organizationsInRoles(
        mockActorContext,
        mockRoleSet,
        [RoleName.MEMBER]
      );

      expect(result).toEqual([
        { role: RoleName.MEMBER, organizations: mockOrgs },
      ]);
    });

    // 027-platform-role-redesign (T051a, T070f): fail closed AS A WHOLE —
    // mirrors usersInRoles. Asserts the returned data path is never reached
    // (not merely that the call threw), which is what tells apart a
    // fail-closed implementation from a partial-result one that also throws.
    it('should deny the whole request and return zero rows when any requested role is denied', async () => {
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(true);
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_actor, _auth, privilege) =>
          privilege !== AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
      );

      await expect(
        resolver.organizationsInRoles(mockActorContext, mockRoleSet, [
          RoleName.MEMBER,
          RoleName.PLATFORM_ROLES_ADMIN,
        ])
      ).rejects.toThrow(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${RoleName.PLATFORM_ROLES_ADMIN}`
      );
      expect(roleSetService.getOrganizationsWithRole).not.toHaveBeenCalled();
    });
  });

  describe('virtualContributorsInRole', () => {
    it('should delegate to roleSetService.getVirtualContributorsWithRole', async () => {
      const mockVCs = [{ id: 'vc-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getVirtualContributorsWithRole as Mock).mockResolvedValue(
        mockVCs
      );

      const result = await resolver.virtualContributorsInRole(
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(result).toEqual(mockVCs);
    });
  });

  describe('virtualContributorsInRoleInHierarchy', () => {
    it('should delegate to roleSetService.getVirtualContributorsInRoleInHierarchy', async () => {
      const mockVCs = [{ id: 'vc-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (
        roleSetService.getVirtualContributorsInRoleInHierarchy as Mock
      ).mockResolvedValue(mockVCs);

      const result = await resolver.virtualContributorsInRoleInHierarchy(
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(result).toEqual(mockVCs);
    });
  });

  describe('virtualContributorsInRoles', () => {
    it('should return VCs grouped by role', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockVCs = [{ id: 'vc-1' }] as any[];

      (roleSetService.getVirtualContributorsWithRole as Mock).mockResolvedValue(
        mockVCs
      );

      const result = await resolver.virtualContributorsInRoles(mockRoleSet, [
        RoleName.MEMBER,
      ]);

      expect(result).toEqual([
        { role: RoleName.MEMBER, virtualContributors: mockVCs },
      ]);
    });
  });

  describe('inivitations', () => {
    it('should delegate to roleSetService.getInvitations', async () => {
      const mockInvitations = [{ id: 'inv-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getInvitations as Mock).mockResolvedValue(
        mockInvitations
      );

      const result = await resolver.inivitations(mockRoleSet);

      expect(result).toEqual(mockInvitations);
    });
  });

  describe('platformInvitations', () => {
    it('should delegate to roleSetService.getPlatformInvitations', async () => {
      const mockPlatformInvs = [{ id: 'pinv-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getPlatformInvitations as Mock).mockResolvedValue(
        mockPlatformInvs
      );

      const result = await resolver.platformInvitations(mockRoleSet);

      expect(result).toEqual(mockPlatformInvs);
    });
  });

  describe('applications', () => {
    it('should delegate to roleSetService.getApplications', async () => {
      const mockApps = [{ id: 'app-1' }] as any[];
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getApplications as Mock).mockResolvedValue(mockApps);

      const result = await resolver.applications(mockRoleSet);

      expect(result).toEqual(mockApps);
    });

    it('should return empty array when getApplications returns null', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;

      (roleSetService.getApplications as Mock).mockResolvedValue(null);

      const result = await resolver.applications(mockRoleSet);

      expect(result).toEqual([]);
    });
  });

  describe('license', () => {
    it('should use data loader to load license', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockLicense = { id: 'lic-1' } as any;
      const mockLoader = { load: vi.fn().mockResolvedValue(mockLicense) };

      const result = await resolver.license(mockRoleSet, mockLoader as any);

      expect(result).toBe(mockLicense);
      expect(mockLoader.load).toHaveBeenCalledWith('rs-1');
    });
  });
});
