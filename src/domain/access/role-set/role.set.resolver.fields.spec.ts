import { RoleName } from '@common/enums/role.name';
import { ValidationException } from '@common/exceptions';
import { PaginationInputOutOfBoundException } from '@common/exceptions/pagination/pagination.input.out.of.bounds.exception';
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

  beforeEach(async () => {
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

    it('should include parent role set credential when parent exists', async () => {
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
      (roleSetService.getCredentialDefinitionForRole as Mock).mockResolvedValue(
        parentCredential
      );
      (
        userService.getPaginatedAvailableEntryRoleUsers as Mock
      ).mockResolvedValue({ items: [] });

      await resolver.availableUsersForEntryRole(mockRoleSet, {} as any);

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

      const result = await resolver.usersInRole(mockRoleSet, RoleName.MEMBER);

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

      await resolver.usersInRole(mockRoleSet, RoleName.MEMBER, 5);

      expect(roleSetService.getUsersWithRole).toHaveBeenCalledWith(
        mockRoleSet,
        RoleName.MEMBER,
        5
      );
    });

    it('should throw when limit is negative', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;

      await expect(
        resolver.usersInRole(mockRoleSet, RoleName.MEMBER, -1)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
    });
  });

  describe('usersInRoles', () => {
    it('should return users grouped by role', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockUsers = [{ id: 'user-1' }] as any[];

      (roleSetService.getUsersWithRole as Mock).mockResolvedValue(mockUsers);

      const result = await resolver.usersInRoles(mockRoleSet, [
        RoleName.MEMBER,
        RoleName.LEAD,
      ]);

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
        resolver.usersInRoles(mockRoleSet, [RoleName.MEMBER], -1)
      ).rejects.toThrow(PaginationInputOutOfBoundException);
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
        mockRoleSet,
        RoleName.MEMBER
      );

      expect(result).toEqual(mockOrgs);
    });
  });

  describe('organizationsInRoles', () => {
    it('should return organizations grouped by role', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockOrgs = [{ id: 'org-1' }] as any[];

      (roleSetService.getOrganizationsWithRole as Mock).mockResolvedValue(
        mockOrgs
      );

      const result = await resolver.organizationsInRoles(mockRoleSet, [
        RoleName.MEMBER,
      ]);

      expect(result).toEqual([
        { role: RoleName.MEMBER, organizations: mockOrgs },
      ]);
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
