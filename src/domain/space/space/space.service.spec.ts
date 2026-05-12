import { AuthorizationPrivilege, ProfileType } from '@common/enums';
import { AccountType } from '@common/enums/account.type';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { TagsetType } from '@common/enums/tagset.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { CalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { InnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.entity';
import { InnovationFlowState } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { Profile } from '@domain/common/profile';
import { TagsetTemplate } from '@domain/common/tagset-template';
import { InnovationHubType } from '@domain/innovation-hub/types';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { Account } from '../account/account.entity';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';
import { SpaceAbout } from '../space.about';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { Space } from './space.entity';
import { SpaceService } from './space.service';

describe('SpaceService', () => {
  let service: SpaceService;
  let spaceRepository: Repository<Space>;
  let urlGeneratorCacheService: UrlGeneratorCacheService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Space),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SpaceService>(SpaceService);
    spaceRepository = module.get<Repository<Space>>(getRepositoryToken(Space));
    urlGeneratorCacheService = module.get<UrlGeneratorCacheService>(
      UrlGeneratorCacheService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSpacePlatformSettings', () => {
    it('should invalidate URL cache when nameID is updated for L0 space', async () => {
      // Arrange
      const spaceId = 'space-1';
      const oldNameID = 'old-space-name';
      const newNameID = 'new-space-name';
      const subspaceId = 'subspace-1';

      const mockSpace = {
        id: spaceId,
        nameID: oldNameID,
        level: SpaceLevel.L0,
        levelZeroSpaceID: spaceId,
        about: {
          profile: {
            id: `profile-${spaceId}`,
          },
        },
      } as Space;

      const mockSubspace = {
        id: subspaceId,
        nameID: 'subspace-name',
        level: SpaceLevel.L1,
        levelZeroSpaceID: spaceId,
        parentSpace: mockSpace,
        about: {
          profile: {
            id: `profile-${subspaceId}`,
          },
        },
      } as Space;

      const updateData: UpdateSpacePlatformSettingsInput = {
        spaceID: spaceId,
        nameID: newNameID,
      };

      // Mock the naming service to return empty reserved nameIDs
      const mockNamingService = {
        getReservedNameIDsLevelZeroSpaces: vi.fn().mockResolvedValue([]),
      };
      service['namingService'] = mockNamingService as any;

      // Mock the repository to return subspaces
      vi.spyOn(spaceRepository, 'findOne').mockImplementation(options => {
        const { where } = options ?? {};
        if (!Array.isArray(where) && where?.id) {
          const result = [mockSpace, mockSubspace].find(
            space => space.id === where.id
          );
          if (result) {
            return Promise.resolve(result);
          }
        }
        return Promise.resolve(null);
      });
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        mockSpace,
        mockSubspace,
      ]);
      vi.spyOn(service, 'save').mockResolvedValue(mockSpace);

      const lookup = (service as any).spaceLookupService as any;
      lookup.getAllDescendantSpaceIDs = vi.fn().mockResolvedValue([subspaceId]);

      // Mock the URL cache service - use direct assignment for mock objects
      const revokeUrlCacheSpy = vi.fn().mockResolvedValue(undefined);
      urlGeneratorCacheService.revokeUrlCache = revokeUrlCacheSpy;
      (urlGeneratorCacheService as any).revokeUrlCachesForCalloutsInSpaces = vi
        .fn()
        .mockResolvedValue(undefined);

      // Act
      await service.updateSpacePlatformSettings(mockSpace, updateData);

      // Assert
      expect(mockSpace.nameID).toBe(newNameID);
      expect(revokeUrlCacheSpy).toHaveBeenCalledWith(`profile-${spaceId}`); // Main space cache invalidated
      expect(revokeUrlCacheSpy).toHaveBeenCalledWith(`profile-${subspaceId}`); // Subspace cache invalidated
      expect(revokeUrlCacheSpy).toHaveBeenCalledTimes(2);
    });

    it('should invalidate URL cache when nameID is updated for subspace', async () => {
      // Arrange
      const parentSpaceId = 'parent-space-1';
      const subspaceId = 'subspace-1';
      const childSubspaceId = 'child-subspace-1';
      const oldNameID = 'old-subspace-name';
      const newNameID = 'new-subspace-name';

      const mockParentSpace = {
        id: parentSpaceId,
        nameID: parentSpaceId,
        level: SpaceLevel.L0,
        levelZeroSpaceID: parentSpaceId,
        about: {
          profile: {
            id: `profile-${parentSpaceId}`,
          },
        },
        platformRolesAccess: {
          roles: [
            {
              roleName: RoleName.MEMBER,
              grantedPrivileges: [AuthorizationPrivilege.READ],
            },
          ],
        },
      } as Space;

      const mockSubspace = {
        id: subspaceId,
        nameID: oldNameID,
        level: SpaceLevel.L1,
        levelZeroSpaceID: parentSpaceId,
        parentSpace: mockParentSpace,
        about: {
          profile: {
            id: `profile-${subspaceId}`,
          },
        },
      } as Space;

      const mockChildSubspace = {
        id: childSubspaceId,
        nameID: 'child-subspace-name',
        level: SpaceLevel.L2,
        levelZeroSpaceID: parentSpaceId,
        parentSpace: mockSubspace,
        about: {
          profile: {
            id: `profile-${childSubspaceId}`,
          },
        },
      } as Space;

      const updateData: UpdateSpacePlatformSettingsInput = {
        spaceID: subspaceId,
        nameID: newNameID,
      };

      // Mock the naming service to return empty reserved nameIDs
      const mockNamingService = {
        getReservedNameIDsInLevelZeroSpace: vi.fn().mockResolvedValue([]),
      };
      service['namingService'] = mockNamingService as any;

      // Mock the repository to return child subspaces
      vi.spyOn(spaceRepository, 'findOne').mockImplementation(options => {
        const { where } = options ?? {};
        if (!Array.isArray(where) && where?.id) {
          const result = [
            mockParentSpace,
            mockSubspace,
            mockChildSubspace,
          ].find(space => space.id === where.id);
          if (result) {
            return Promise.resolve(result);
          }
        }
        return Promise.resolve(null);
      });
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        mockSubspace,
        mockChildSubspace,
      ]);
      vi.spyOn(service, 'save').mockResolvedValue(mockSubspace);

      const lookup = (service as any).spaceLookupService as any;
      lookup.getAllDescendantSpaceIDs = vi
        .fn()
        .mockResolvedValue([childSubspaceId]);

      // Mock the URL cache service - use direct assignment for mock objects
      const revokeUrlCacheSpy = vi.fn().mockResolvedValue(undefined);
      urlGeneratorCacheService.revokeUrlCache = revokeUrlCacheSpy;
      (urlGeneratorCacheService as any).revokeUrlCachesForCalloutsInSpaces = vi
        .fn()
        .mockResolvedValue(undefined);

      // Act
      await service.updateSpacePlatformSettings(mockSubspace, updateData);

      // Assert
      expect(mockSubspace.nameID).toBe(newNameID);
      expect(revokeUrlCacheSpy).toHaveBeenCalledWith(`profile-${subspaceId}`); // Main subspace cache invalidated
      expect(revokeUrlCacheSpy).toHaveBeenCalledWith(
        `profile-${childSubspaceId}`
      ); // Child subspace cache invalidated
      expect(revokeUrlCacheSpy).toHaveBeenCalledTimes(2);
    });

    it('should update visibility to INACTIVE on L0 space', async () => {
      // Arrange
      const spaceId = 'space-1';
      const nameID = 'space-name';

      const mockSpace = {
        id: spaceId,
        nameID: nameID,
        level: SpaceLevel.L0,
        levelZeroSpaceID: spaceId,
        visibility: SpaceVisibility.ACTIVE,
      } as Space;

      const updateData: UpdateSpacePlatformSettingsInput = {
        spaceID: spaceId,
        visibility: SpaceVisibility.INACTIVE,
      };

      vi.spyOn(spaceRepository, 'findOne').mockImplementation(options => {
        const { where } = options ?? {};
        if (!Array.isArray(where) && where?.id) {
          const result = [mockSpace].find(space => space.id === where.id);
          if (result) {
            return Promise.resolve(result);
          }
        }
        return Promise.resolve(null);
      });
      vi.spyOn(service, 'save').mockResolvedValue(mockSpace);
      vi.spyOn(
        service,
        'updateSpaceVisibilityAllSubspaces' as any
      ).mockResolvedValue(undefined);

      const revokeUrlCacheSpy = vi.fn().mockResolvedValue(undefined);
      urlGeneratorCacheService.revokeUrlCache = revokeUrlCacheSpy;

      // Act
      await service.updateSpacePlatformSettings(mockSpace, updateData);

      // Assert
      expect(mockSpace.visibility).toBe(SpaceVisibility.INACTIVE);
    });

    it('should not invalidate URL cache when nameID is not changed', async () => {
      // Arrange
      const spaceId = 'space-1';
      const nameID = 'same-space-name';

      const mockSpace = {
        id: spaceId,
        nameID: nameID,
        level: SpaceLevel.L0,
        levelZeroSpaceID: spaceId,
        visibility: SpaceVisibility.ACTIVE,
      } as Space;

      const updateData: UpdateSpacePlatformSettingsInput = {
        spaceID: spaceId,
        visibility: SpaceVisibility.DEMO, // Only changing visibility, not nameID
      };

      vi.spyOn(spaceRepository, 'findOne').mockImplementation(options => {
        const { where } = options ?? {};
        if (!Array.isArray(where) && where?.id) {
          const result = [mockSpace].find(space => space.id === where.id);
          if (result) {
            return Promise.resolve(result);
          }
        }
        return Promise.resolve(null);
      });
      vi.spyOn(service, 'save').mockResolvedValue(mockSpace);
      vi.spyOn(
        service,
        'updateSpaceVisibilityAllSubspaces' as any
      ).mockResolvedValue(undefined);

      // Mock the URL cache service - use direct assignment for mock objects
      const revokeUrlCacheSpy = vi.fn().mockResolvedValue(undefined);
      urlGeneratorCacheService.revokeUrlCache = revokeUrlCacheSpy;

      // Act
      await service.updateSpacePlatformSettings(mockSpace, updateData);

      // Assert
      expect(revokeUrlCacheSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalidateUrlCacheForSpaceSubtree', () => {
    it('revokes URL cache for the space and all descendants in a single fetch', async () => {
      const rootId = 'space-root';
      const childId = 'space-child';
      const grandchildId = 'space-grandchild';

      const lookup = (service as any).spaceLookupService as any;
      lookup.getAllDescendantSpaceIDs = vi
        .fn()
        .mockResolvedValue([childId, grandchildId]);

      const findSpy = vi
        .spyOn(spaceRepository, 'find')
        .mockResolvedValue([
          { about: { profile: { id: `profile-${rootId}` } } },
          { about: { profile: { id: `profile-${childId}` } } },
          { about: { profile: { id: `profile-${grandchildId}` } } },
        ] as any);

      const revokeSpy = vi
        .spyOn(urlGeneratorCacheService, 'revokeUrlCache')
        .mockResolvedValue(undefined);
      const revokeCalloutsSpy = vi.fn().mockResolvedValue(undefined);
      (urlGeneratorCacheService as any).revokeUrlCachesForCalloutsInSpaces =
        revokeCalloutsSpy;

      await service.invalidateUrlCacheForSpaceSubtree(rootId);

      expect(findSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).toHaveBeenCalledTimes(3);
      expect(revokeSpy).toHaveBeenCalledWith(`profile-${rootId}`);
      expect(revokeSpy).toHaveBeenCalledWith(`profile-${childId}`);
      expect(revokeSpy).toHaveBeenCalledWith(`profile-${grandchildId}`);
      expect(revokeCalloutsSpy).toHaveBeenCalledWith([
        rootId,
        childId,
        grandchildId,
      ]);
    });

    it('skips spaces that have no profile id', async () => {
      const rootId = 'space-root';
      const lookup = (service as any).spaceLookupService as any;
      lookup.getAllDescendantSpaceIDs = vi.fn().mockResolvedValue([]);

      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        { about: undefined } as any,
      ]);

      const revokeSpy = vi
        .spyOn(urlGeneratorCacheService, 'revokeUrlCache')
        .mockResolvedValue(undefined);
      const revokeCalloutsSpy = vi.fn().mockResolvedValue(undefined);
      (urlGeneratorCacheService as any).revokeUrlCachesForCalloutsInSpaces =
        revokeCalloutsSpy;

      await service.invalidateUrlCacheForSpaceSubtree(rootId);

      expect(revokeSpy).not.toHaveBeenCalled();
      expect(revokeCalloutsSpy).toHaveBeenCalledWith([rootId]);
    });
  });

  describe('shouldUpdateAuthorizationPolicy', () => {
    it('returns false if there is no difference in settings', async () => {
      const spaceId = '1';
      const settingsData = {
        collaboration: { allowEventsFromSubspaces: true },
      } as ISpaceSettings;
      const space = {
        id: spaceId,
        settings: settingsData,
      } as Space;

      vi.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue(space);

      const result = await service.shouldUpdateAuthorizationPolicy(
        spaceId,
        settingsData
      );
      expect(result).toBe(false);
    });

    it('returns true if there is a difference in settings outside allowed fields', async () => {
      const spaceId = '1';
      const settingsData = {
        collaboration: {
          allowEventsFromSubspaces: false,
          allowMembersToCreateSubspaces: false,
        },
      } as ISpaceSettings;
      const originalSettings = {
        collaboration: {
          allowEventsFromSubspaces: true,
          allowMembersToCreateSubspaces: true,
        },
      } as ISpaceSettings;
      const space = {
        id: spaceId,
        settings: originalSettings,
      } as Space;

      vi.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue(space);

      const result = await service.shouldUpdateAuthorizationPolicy(
        spaceId,
        settingsData
      );
      expect(result).toBe(true);
    });

    it('returns false if the difference is only in allowed fields', async () => {
      const spaceId = '1';
      const settingsData = {
        collaboration: { allowEventsFromSubspaces: false },
      } as ISpaceSettings;
      const originalSettings = {
        collaboration: { allowEventsFromSubspaces: true },
      } as ISpaceSettings;
      const space = {
        id: spaceId,
        settings: originalSettings,
      } as Space;

      vi.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue(space);

      const result = await service.shouldUpdateAuthorizationPolicy(
        spaceId,
        settingsData
      );
      expect(result).toBe(false);
    });

    it('throws an error if space is not found', async () => {
      const spaceId = '1';
      const settingsData = {
        collaboration: { allowEventsFromSubspaces: true },
      } as ISpaceSettings;

      vi.spyOn(spaceRepository, 'findOneOrFail').mockRejectedValue(
        new Error('Space not found')
      );

      await expect(
        service.shouldUpdateAuthorizationPolicy(spaceId, settingsData)
      ).rejects.toThrow('Space not found');
    });
  });

  describe('updateSubspacePinned', () => {
    const parentSpaceId = 'parent-space-1';
    const subspaceId = 'subspace-1';

    const createMockSubspace = (id: string, pinned: boolean) =>
      ({
        id,
        pinned,
        settings: spaceSettings,
        platformRolesAccess: { roles: [] },
      }) as unknown as Space;

    it('should pin a subspace that is currently unpinned', async () => {
      const mockSubspace = createMockSubspace(subspaceId, false);
      const mockParent = {
        id: parentSpaceId,
        subspaces: [mockSubspace],
      } as unknown as Space;

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockParent);
      const saveSpy = vi
        .spyOn(service, 'save')
        .mockResolvedValue({ ...mockSubspace, pinned: true } as Space);

      const result = await service.updateSubspacePinned(
        parentSpaceId,
        subspaceId,
        true
      );

      expect(saveSpy).toHaveBeenCalled();
      expect(result.pinned).toBe(true);
    });

    it('should short-circuit when pinned value is unchanged', async () => {
      const mockSubspace = createMockSubspace(subspaceId, true);
      const mockParent = {
        id: parentSpaceId,
        subspaces: [mockSubspace],
      } as unknown as Space;

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockParent);
      const saveSpy = vi.spyOn(service, 'save');

      const result = await service.updateSubspacePinned(
        parentSpaceId,
        subspaceId,
        true
      );

      expect(saveSpy).not.toHaveBeenCalled();
      expect(result.pinned).toBe(true);
    });

    it('should throw when parent space has no subspaces', async () => {
      const mockParent = {
        id: parentSpaceId,
        subspaces: undefined,
      } as unknown as Space;

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockParent);

      await expect(
        service.updateSubspacePinned(parentSpaceId, subspaceId, true)
      ).rejects.toThrow();
    });

    it('should throw when subspace is not found within parent', async () => {
      const otherSubspace = createMockSubspace('other-subspace', false);
      const mockParent = {
        id: parentSpaceId,
        subspaces: [otherSubspace],
      } as unknown as Space;

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockParent);

      await expect(
        service.updateSubspacePinned(parentSpaceId, subspaceId, true)
      ).rejects.toThrow();
    });
  });

  describe('getSpacesForInnovationHub', () => {
    it('should return spaces for VISIBILITY type hub', async () => {
      const mockSpaces = [{ id: 'space-1' }] as Space[];
      vi.spyOn(spaceRepository, 'findBy').mockResolvedValue(mockSpaces);

      const result = await service.getSpacesForInnovationHub({
        id: 'hub-1',
        type: InnovationHubType.VISIBILITY,
        spaceVisibilityFilter: SpaceVisibility.ACTIVE,
      } as any);

      expect(result).toEqual(mockSpaces);
      expect(spaceRepository.findBy).toHaveBeenCalledWith({
        visibility: SpaceVisibility.ACTIVE,
        level: SpaceLevel.L0,
      });
    });

    it('should throw when VISIBILITY hub has no filter', async () => {
      await expect(
        service.getSpacesForInnovationHub({
          id: 'hub-1',
          type: InnovationHubType.VISIBILITY,
          spaceVisibilityFilter: undefined,
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should return sorted spaces for LIST type hub', async () => {
      const mockSpaces = [{ id: 'space-2' }, { id: 'space-1' }] as Space[];
      vi.spyOn(spaceRepository, 'findBy').mockResolvedValue(mockSpaces);

      const result = await service.getSpacesForInnovationHub({
        id: 'hub-1',
        type: InnovationHubType.LIST,
        spaceListFilter: ['space-1', 'space-2'],
      } as any);

      expect(result[0].id).toBe('space-1');
      expect(result[1].id).toBe('space-2');
    });

    it('should throw when LIST hub has no filter', async () => {
      await expect(
        service.getSpacesForInnovationHub({
          id: 'hub-1',
          type: InnovationHubType.LIST,
          spaceListFilter: undefined,
        } as any)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw for unsupported hub type', async () => {
      await expect(
        service.getSpacesForInnovationHub({
          id: 'hub-1',
          type: 'UNKNOWN' as any,
        } as any)
      ).rejects.toThrow(NotSupportedException);
    });
  });

  describe('getSpaceOrFail', () => {
    it('should return space when found', async () => {
      const mockSpace = { id: 'space-1' } as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getSpaceOrFail('space-1');

      expect(result).toBe(mockSpace);
    });

    it('should throw EntityNotFoundException when space not found', async () => {
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getSpaceOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getSpace', () => {
    it('should return space when found', async () => {
      const mockSpace = { id: 'space-1' } as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service['getSpace']('space-1');

      expect(result).toBe(mockSpace);
    });

    it('should return null when space not found', async () => {
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      const result = await service['getSpace']('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('createLicenseForSpaceL0', () => {
    it('should create license with all required entitlements', () => {
      const licenseService = {
        createLicense: vi.fn().mockReturnValue({ id: 'license-1' }),
      };
      service['licenseService'] = licenseService as any;

      const result = service.createLicenseForSpaceL0();

      expect(licenseService.createLicense).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlements: expect.arrayContaining([
            expect.objectContaining({ type: 'space-free' }),
            expect.objectContaining({ type: 'space-plus' }),
            expect.objectContaining({ type: 'space-premium' }),
          ]),
        })
      );
      expect(result).toEqual({ id: 'license-1' });
    });
  });

  describe('deleteSpaceOrFail', () => {
    it('should throw when space has subspaces', async () => {
      const mockSpace = {
        id: 'space-1',
        level: SpaceLevel.L0,
        subspaces: [{ id: 'subspace-1' }],
        collaboration: {},
        community: {},
        about: {},
        storageAggregator: {},
        authorization: {},
        license: {},
      } as unknown as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.deleteSpaceOrFail({ ID: 'space-1' })
      ).rejects.toThrow(OperationNotAllowedException);
    });

    it('should throw when relations are missing', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: undefined,
      } as unknown as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.deleteSpaceOrFail({ ID: 'space-1' })
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('updateSubspacesSortOrder', () => {
    it('should throw on duplicate subspace IDs', async () => {
      await expect(
        service.updateSubspacesSortOrder({ id: 'space-1' } as any, {
          spaceID: 'space-1',
          subspaceIDs: ['sub-1', 'sub-1'],
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw when subspace IDs not found', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: [{ id: 'sub-1', sortOrder: 0 }],
      } as unknown as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.updateSubspacesSortOrder({ id: 'space-1' } as any, {
          spaceID: 'space-1',
          subspaceIDs: ['sub-1', 'sub-missing'],
        })
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should update sort order for valid subspaces', async () => {
      const sub1 = { id: 'sub-1', sortOrder: 0 };
      const sub2 = { id: 'sub-2', sortOrder: 10 };
      const mockSpace = {
        id: 'space-1',
        subspaces: [sub1, sub2],
      } as unknown as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);
      vi.spyOn(spaceRepository, 'save').mockResolvedValue([] as any);

      const result = await service.updateSubspacesSortOrder(
        { id: 'space-1' } as any,
        { spaceID: 'space-1', subspaceIDs: ['sub-2', 'sub-1'] }
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub-2');
      expect(result[1].id).toBe('sub-1');
    });

    it('should throw when space has no subspaces', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: undefined,
      } as unknown as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.updateSubspacesSortOrder({ id: 'space-1' } as any, {
          spaceID: 'space-1',
          subspaceIDs: ['sub-1'],
        })
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getSubscriptions', () => {
    it('should return subscriptions for valid credentials', async () => {
      const mockSpace = {
        id: 'space-1',
        credentials: [
          {
            type: LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE,
            expires: new Date('2030-01-01'),
          },
          { type: 'non-license-type', expires: null },
        ],
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getSubscriptions(mockSpace);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe(
        LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE
      );
    });

    it('should throw when credentials not found', async () => {
      const mockSpace = {
        id: 'space-1',
        credentials: undefined,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(service.getSubscriptions(mockSpace)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should return empty when no license credentials', async () => {
      const mockSpace = {
        id: 'space-1',
        credentials: [{ type: 'non-license-type' }],
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getSubscriptions(mockSpace);

      expect(result).toEqual([]);
    });
  });

  describe('assignUserToRoles', () => {
    it('should not assign roles when actorID is missing', async () => {
      const roleSetService = {
        assignActorToRole: vi.fn(),
      };
      service['roleSetService'] = roleSetService as any;

      await service.assignUserToRoles(
        { id: 'rs-1' } as any,
        {
          actorID: '',
        } as any
      );

      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('should not assign roles when actorID has wrong length', async () => {
      const roleSetService = {
        assignActorToRole: vi.fn(),
      };
      service['roleSetService'] = roleSetService as any;

      await service.assignUserToRoles(
        { id: 'rs-1' } as any,
        {
          actorID: 'short-id',
        } as any
      );

      expect(roleSetService.assignActorToRole).not.toHaveBeenCalled();
    });

    it('should assign MEMBER, LEAD, and ADMIN roles when actorID is valid', async () => {
      const uuid = '12345678-1234-1234-1234-123456789012';
      const roleSetService = {
        assignActorToRole: vi.fn().mockResolvedValue(undefined),
      };
      service['roleSetService'] = roleSetService as any;
      const roleSet = { id: 'rs-1' } as any;
      const actorContext = { actorID: uuid } as any;

      await service.assignUserToRoles(roleSet, actorContext);

      expect(roleSetService.assignActorToRole).toHaveBeenCalledTimes(3);
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        roleSet,
        RoleName.MEMBER,
        uuid,
        actorContext
      );
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        roleSet,
        RoleName.LEAD,
        uuid,
        actorContext
      );
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        roleSet,
        RoleName.ADMIN,
        uuid,
        actorContext
      );
    });
  });

  describe('assignOrganizationToMemberLeadRoles', () => {
    it('should assign MEMBER and LEAD roles', async () => {
      const roleSetService = {
        assignActorToRole: vi.fn().mockResolvedValue(undefined),
      };
      service['roleSetService'] = roleSetService as any;
      const roleSet = { id: 'rs-1' } as any;

      await service.assignOrganizationToMemberLeadRoles(roleSet, 'org-1');

      expect(roleSetService.assignActorToRole).toHaveBeenCalledTimes(2);
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        roleSet,
        RoleName.MEMBER,
        'org-1'
      );
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        roleSet,
        RoleName.LEAD,
        'org-1'
      );
    });
  });

  describe('update', () => {
    it('should throw when about is not initialized', async () => {
      const mockSpace = { id: 'space-1', about: undefined } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(service.update({ ID: 'space-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getSubspaces', () => {
    it('should return sorted subspaces by sortOrder and displayName', async () => {
      const mockSubspaces = [
        {
          id: 'sub-2',
          sortOrder: 1,
          about: { profile: { displayName: 'Bravo' } },
        },
        {
          id: 'sub-1',
          sortOrder: 0,
          about: { profile: { displayName: 'Alpha' } },
        },
        {
          id: 'sub-3',
          sortOrder: 0,
          about: { profile: { displayName: 'Charlie' } },
        },
      ];
      const mockSpace = {
        id: 'space-1',
        subspaces: mockSubspaces,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getSubspaces({ id: 'space-1' } as any);

      // sortOrder 0 first (Alpha, Charlie), then sortOrder 1 (Bravo)
      expect(result[0].id).toBe('sub-1');
      expect(result[1].id).toBe('sub-3');
      expect(result[2].id).toBe('sub-2');
    });

    it('should throw when subspaces are undefined', async () => {
      const mockSpace = {
        id: 'space-1',
        subspaces: undefined,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.getSubspaces({ id: 'space-1' } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should filter by IDs when provided', async () => {
      const mockSubspaces = [
        {
          id: 'sub-1',
          sortOrder: 0,
          about: { profile: { displayName: 'Alpha' } },
        },
        {
          id: 'sub-2',
          sortOrder: 1,
          about: { profile: { displayName: 'Bravo' } },
        },
      ];
      const mockSpace = {
        id: 'space-1',
        subspaces: mockSubspaces,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getSubspaces({ id: 'space-1' } as any, {
        IDs: ['sub-1'],
      });

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('sub-1');
    });
  });

  describe('getCommunity', () => {
    it('should return community when found', async () => {
      const mockCommunity = { id: 'community-1' };
      const mockSpace = {
        id: 'space-1',
        community: mockCommunity,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getCommunity('space-1');

      expect(result).toBe(mockCommunity);
    });

    it('should throw when community not found', async () => {
      const mockSpace = {
        id: 'space-1',
        community: undefined,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(service.getCommunity('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getTemplatesManagerOrFail', () => {
    it('should return templates manager when found', async () => {
      const mockTM = { id: 'tm-1' };
      const mockSpace = {
        id: 'space-1',
        templatesManager: mockTM,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getTemplatesManagerOrFail('space-1');

      expect(result).toBe(mockTM);
    });

    it('should throw when templates manager not found', async () => {
      const mockSpace = {
        id: 'space-1',
        templatesManager: undefined,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.getTemplatesManagerOrFail('space-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getStorageAggregatorOrFail', () => {
    it('should return storage aggregator when found', async () => {
      const mockSA = { id: 'sa-1' };
      const mockSpace = {
        id: 'space-1',
        storageAggregator: mockSA,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getStorageAggregatorOrFail('space-1');

      expect(result).toBe(mockSA);
    });

    it('should throw when storage aggregator not found', async () => {
      const mockSpace = {
        id: 'space-1',
        storageAggregator: undefined,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(
        service.getStorageAggregatorOrFail('space-1')
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });

  describe('getSpaceAbout', () => {
    it('should return about when found', async () => {
      const mockAbout = { id: 'about-1' };
      const mockSpace = {
        id: 'space-1',
        about: mockAbout,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getSpaceAbout('space-1');

      expect(result).toBe(mockAbout);
    });

    it('should throw when about not found', async () => {
      const mockSpace = {
        id: 'space-1',
        about: undefined,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(service.getSpaceAbout('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getCalloutsSetOrFail', () => {
    it('should return callouts set when found', async () => {
      const mockCalloutsSet = { id: 'cs-1' };
      const mockSpace = {
        id: 'space-1',
        collaboration: { calloutsSet: mockCalloutsSet },
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getCalloutsSetOrFail('space-1');

      expect(result).toBe(mockCalloutsSet);
    });

    it('should throw when callouts set not found', async () => {
      const mockSpace = {
        id: 'space-1',
        collaboration: { calloutsSet: undefined },
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      await expect(service.getCalloutsSetOrFail('space-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('getAccountForLevelZeroSpaceOrFail', () => {
    it('should return account when found', async () => {
      const mockAccount = { id: 'account-1' };
      const mockSpace = {
        id: 'space-1',
        levelZeroSpaceID: 'space-1',
        account: mockAccount,
      } as any;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getAccountForLevelZeroSpaceOrFail(mockSpace);

      expect(result).toBe(mockAccount);
    });

    it('should throw when account not found', async () => {
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getAccountForLevelZeroSpaceOrFail({
          id: 'space-1',
          levelZeroSpaceID: 'space-1',
        } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getAllSpaces', () => {
    it('should return all spaces', async () => {
      const mockSpaces = [{ id: 'space-1' }, { id: 'space-2' }] as Space[];
      vi.spyOn(spaceRepository, 'find').mockResolvedValue(mockSpaces);

      const result = await service.getAllSpaces();

      expect(result).toEqual(mockSpaces);
    });
  });

  describe('save', () => {
    it('should save a space', async () => {
      const mockSpace = { id: 'space-1' } as Space;
      vi.spyOn(spaceRepository, 'save').mockResolvedValue(mockSpace);

      const result = await service.save(mockSpace);

      expect(result).toBe(mockSpace);
    });
  });

  describe('getAgent', () => {
    it('should return the space itself as agent', async () => {
      const mockSpace = { id: 'space-1' } as Space;
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace);

      const result = await service.getAgent('space-1');

      expect(result).toBe(mockSpace);
    });
  });

  describe('getSubspaceInLevelZeroScopeOrFail', () => {
    it('should throw when subspace not found', async () => {
      const spaceLookupService = {
        getSubspaceByNameIdInLevelZeroSpace: vi.fn().mockResolvedValue(null),
      };
      service['spaceLookupService'] = spaceLookupService as any;

      await expect(
        service.getSubspaceInLevelZeroScopeOrFail('sub-1', 'space-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should return subspace when found', async () => {
      const mockSubspace = { id: 'sub-1' };
      const spaceLookupService = {
        getSubspaceByNameIdInLevelZeroSpace: vi
          .fn()
          .mockResolvedValue(mockSubspace),
      };
      service['spaceLookupService'] = spaceLookupService as any;

      const result = await service.getSubspaceInLevelZeroScopeOrFail(
        'sub-1',
        'space-1'
      );

      expect(result).toBe(mockSubspace);
    });
  });

  describe('addSubspaceToSpace', () => {
    it('should throw when communities are missing', async () => {
      const space = { id: 'space-1', community: undefined } as any;
      const subspace = { id: 'sub-1', community: {} } as any;

      await expect(service.addSubspaceToSpace(space, subspace)).rejects.toThrow(
        ValidationException
      );
    });
  });

  describe('updateSpacePlatformSettings - visibility on non-L0', () => {
    it('should throw when updating visibility on non-L0 space', async () => {
      const mockSpace = {
        id: 'space-1',
        level: SpaceLevel.L1,
        visibility: SpaceVisibility.ACTIVE,
        nameID: 'space-name',
      } as any;

      await expect(
        service.updateSpacePlatformSettings(mockSpace, {
          spaceID: 'space-1',
          visibility: SpaceVisibility.INACTIVE,
        })
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('updateSubspacePinned', () => {
    it('should pin a subspace successfully', async () => {
      const mockSubspace = { id: 'sub-1', pinned: false };
      const mockSpace = {
        id: 'space-1',
        subspaces: [mockSubspace],
      };
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace as any);
      vi.spyOn(spaceRepository, 'save').mockResolvedValue({
        ...mockSubspace,
        pinned: true,
      } as any);

      const result = await service.updateSubspacePinned(
        'space-1',
        'sub-1',
        true
      );

      expect(result.pinned).toBe(true);
    });

    it('should return subspace unchanged when already in requested pin state', async () => {
      const mockSubspace = { id: 'sub-1', pinned: true };
      const mockSpace = {
        id: 'space-1',
        subspaces: [mockSubspace],
      };
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace as any);

      const result = await service.updateSubspacePinned(
        'space-1',
        'sub-1',
        true
      );

      expect(result).toBe(mockSubspace);
      expect(spaceRepository.save).not.toHaveBeenCalled();
    });

    it('should throw when subspaces are not loaded', async () => {
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue({
        id: 'space-1',
        subspaces: undefined,
      } as any);

      await expect(
        service.updateSubspacePinned('space-1', 'sub-1', true)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when subspace not found within parent', async () => {
      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue({
        id: 'space-1',
        subspaces: [{ id: 'other-sub' }],
      } as any);

      await expect(
        service.updateSubspacePinned('space-1', 'sub-1', true)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('shouldUpdateAuthorizationPolicy', () => {
    it('should return false when no settings differ', async () => {
      const currentSettings = {
        collaboration: { allowEventsFromSubspaces: true },
        privacy: {
          mode: SpacePrivacyMode.PUBLIC,
          allowPlatformSupportAsAdmin: false,
        },
      };
      vi.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue({
        id: 'space-1',
        settings: currentSettings,
      } as any);

      const result = await service.shouldUpdateAuthorizationPolicy(
        'space-1',
        currentSettings as any
      );

      expect(result).toBe(false);
    });

    it('should return false when only allowed fields differ', async () => {
      vi.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue({
        id: 'space-1',
        settings: {
          collaboration: { allowEventsFromSubspaces: false },
          privacy: {
            mode: SpacePrivacyMode.PUBLIC,
            allowPlatformSupportAsAdmin: false,
          },
        },
      } as any);

      const result = await service.shouldUpdateAuthorizationPolicy('space-1', {
        collaboration: { allowEventsFromSubspaces: true },
      } as any);

      expect(result).toBe(false);
    });

    it('should return true when non-allowed fields differ', async () => {
      vi.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue({
        id: 'space-1',
        settings: {
          privacy: {
            mode: SpacePrivacyMode.PUBLIC,
            allowPlatformSupportAsAdmin: false,
          },
          collaboration: { allowEventsFromSubspaces: false },
        },
      } as any);

      const result = await service.shouldUpdateAuthorizationPolicy('space-1', {
        privacy: {
          mode: SpacePrivacyMode.PRIVATE,
          allowPlatformSupportAsAdmin: false,
        },
      } as any);

      expect(result).toBe(true);
    });
  });

  describe('getSpacesInList', () => {
    it('should return spaces matching given IDs and active visibilities', async () => {
      const mockSpaces = [
        { id: 'space-1', visibility: SpaceVisibility.ACTIVE },
        { id: 'space-2', visibility: SpaceVisibility.DEMO },
      ];
      vi.spyOn(spaceRepository, 'find').mockResolvedValue(mockSpaces as any);

      const result = await service.getSpacesInList(['space-1', 'space-2']);

      expect(result).toHaveLength(2);
      expect(spaceRepository.find).toHaveBeenCalled();
    });

    it('should return empty array when no spaces match', async () => {
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([]);

      const result = await service.getSpacesInList(['missing-id']);

      expect(result).toEqual([]);
    });
  });

  describe('getSpacesByVisibilities', () => {
    it('should query spaces with given IDs and visibilities', async () => {
      const mockSpaces = [{ id: 'space-1' }];
      vi.spyOn(spaceRepository, 'find').mockResolvedValue(mockSpaces as any);

      const result = await service.getSpacesByVisibilities(
        ['space-1'],
        [SpaceVisibility.ACTIVE]
      );

      expect(result).toHaveLength(1);
    });

    it('should handle empty visibilities array', async () => {
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([]);

      const result = await service.getSpacesByVisibilities(['space-1'], []);

      expect(result).toEqual([]);
    });
  });

  describe('createTemplatesManagerForSpaceL0', () => {
    it('should create templates manager with subspace default', async () => {
      const mockTemplatesManager = { id: 'tm-1' };
      const templatesManagerService = (service as any).templatesManagerService;
      (templatesManagerService.createTemplatesManager as any).mockResolvedValue(
        mockTemplatesManager
      );

      const result = await service.createTemplatesManagerForSpaceL0();

      expect(result).toBe(mockTemplatesManager);
      expect(
        templatesManagerService.createTemplatesManager
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          templateDefaultsData: expect.arrayContaining([
            expect.objectContaining({
              type: 'space-subspace',
              allowedTemplateType: 'space',
            }),
          ]),
        })
      );
    });
  });

  describe('activeSubscription', () => {
    it('should return undefined when licensing framework throws', async () => {
      const licensingFrameworkService = (service as any)
        .licensingFrameworkService;
      (
        licensingFrameworkService.getDefaultLicensingOrFail as any
      ).mockRejectedValue(new Error('not found'));

      const result = await service.activeSubscription({
        id: 'space-1',
      } as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no matching subscriptions', async () => {
      const licensingFrameworkService = (service as any)
        .licensingFrameworkService;
      (
        licensingFrameworkService.getDefaultLicensingOrFail as any
      ).mockResolvedValue({ id: 'framework-1' });
      (
        licensingFrameworkService.getLicensePlansOrFail as any
      ).mockResolvedValue([]);

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue({
        id: 'space-1',
        credentials: [],
      } as any);

      const result = await service.activeSubscription({
        id: 'space-1',
      } as any);

      expect(result).toBeUndefined();
    });

    it('should return the highest-priority active subscription', async () => {
      const licensingFrameworkService = (service as any)
        .licensingFrameworkService;
      (
        licensingFrameworkService.getDefaultLicensingOrFail as any
      ).mockResolvedValue({ id: 'framework-1' });
      (
        licensingFrameworkService.getLicensePlansOrFail as any
      ).mockResolvedValue([
        {
          licenseCredential:
            LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE,
          type: LicensingCredentialBasedPlanType.SPACE_PLAN,
          sortOrder: 1,
        },
        {
          licenseCredential:
            LicensingCredentialBasedCredentialType.SPACE_LICENSE_PLUS,
          type: LicensingCredentialBasedPlanType.SPACE_PLAN,
          sortOrder: 2,
        },
      ]);

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue({
        id: 'space-1',
        credentials: [
          {
            type: LicensingCredentialBasedCredentialType.SPACE_LICENSE_FREE,
            expires: undefined,
          },
          {
            type: LicensingCredentialBasedCredentialType.SPACE_LICENSE_PLUS,
            expires: undefined,
          },
        ],
      } as any);

      const result = await service.activeSubscription({
        id: 'space-1',
      } as any);

      expect(result).toBeDefined();
      expect(result?.name).toBe(
        LicensingCredentialBasedCredentialType.SPACE_LICENSE_PLUS
      );
    });
  });

  describe('updateSettings', () => {
    it('should update settings and call updatePlatformRolesAccessRecursively', async () => {
      const mockSpace = {
        id: 'space-1',
        settings: {
          privacy: {
            mode: SpacePrivacyMode.PUBLIC,
            allowPlatformSupportAsAdmin: false,
          },
        },
        parentSpace: undefined,
      };
      const updatedSpace = { ...mockSpace };

      vi.spyOn(spaceRepository, 'findOne').mockResolvedValue(mockSpace as any);
      vi.spyOn(spaceRepository, 'save').mockResolvedValue(updatedSpace as any);

      const spaceSettingsService = (service as any).spaceSettingsService;
      (spaceSettingsService.updateSettings as any).mockReturnValue(
        mockSpace.settings
      );

      const spacePlatformRolesAccessService = (service as any)
        .spacePlatformRolesAccessService;
      (
        spacePlatformRolesAccessService.createPlatformRolesAccess as any
      ).mockReturnValue({});

      const result = await service.updateSettings('space-1', {} as any);

      expect(spaceSettingsService.updateSettings).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getExploreSpaces', () => {
    it('should return empty array when no active spaces found', async () => {
      const mockQb = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(spaceRepository, 'createQueryBuilder').mockReturnValue(
        mockQb as any
      );

      const result = await service.getExploreSpaces();

      expect(result).toEqual([]);
    });

    it('should return spaces ordered by activity count', async () => {
      const mockQb = {
        select: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi
          .fn()
          .mockResolvedValue([{ id: 'space-2' }, { id: 'space-1' }]),
      };
      vi.spyOn(spaceRepository, 'createQueryBuilder').mockReturnValue(
        mockQb as any
      );
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([
        { id: 'space-1' },
        { id: 'space-2' },
      ] as any);

      const result = await service.getExploreSpaces();

      expect(result).toHaveLength(2);
      // Should preserve activity-based ordering
      expect(result[0].id).toBe('space-2');
      expect(result[1].id).toBe('space-1');
    });
  });

  describe('orderSpacesDefault', () => {
    it('should sort spaces based on query builder result', async () => {
      const mockSpaces = [{ id: 'space-1' }, { id: 'space-2' }] as any[];
      const mockQb = {
        leftJoin: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([
          {
            id: 'space-2',
            visibility: SpaceVisibility.ACTIVE,
            settings: {
              privacy: { mode: SpacePrivacyMode.PUBLIC },
            },
            subspaces: [{ subspaces: [] }],
          },
          {
            id: 'space-1',
            visibility: SpaceVisibility.ACTIVE,
            settings: {
              privacy: { mode: SpacePrivacyMode.PRIVATE },
            },
            subspaces: [],
          },
        ]),
      };
      vi.spyOn(spaceRepository, 'createQueryBuilder').mockReturnValue(
        mockQb as any
      );

      const result = await service.orderSpacesDefault(mockSpaces);

      // Public space should come first
      expect(result[0].id).toBe('space-2');
      expect(result[1].id).toBe('space-1');
    });
  });

  describe('setRoleSetHierarchyForSubspace (private)', () => {
    it('should throw when child community is missing roleSet', async () => {
      await expect(
        (service as any).setRoleSetHierarchyForSubspace(
          { roleSet: { id: 'rs-1' } },
          { id: 'child-comm', roleSet: undefined }
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw when parent community is missing roleSet', async () => {
      await expect(
        (service as any).setRoleSetHierarchyForSubspace(
          { roleSet: undefined },
          { id: 'child-comm', roleSet: { id: 'rs-1' } }
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });
});

/**
 * Active spaces go first and then all the Demo spaces
 * In those two groups, Public spaces go first
 * And then they are sorted by number of challenges and number of opportunities
 */
describe('SpacesSorting', () => {
  let service: SpaceService;
  let filterService: SpaceFilterService;

  beforeEach(async () => {
    const filterModule: TestingModule = await Test.createTestingModule({
      providers: [SpaceFilterService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    filterService = filterModule.get<SpaceFilterService>(SpaceFilterService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Space),
      ],
    })
      .useMocker(injectionToken => {
        // SpaceFilterService should be a real one and not mocked.
        if (
          typeof injectionToken === 'function' &&
          injectionToken.name === 'SpaceFilterService'
        ) {
          return filterService;
        }
        // The rest of the dependencies can be mocks
        return defaultMockerFactory(injectionToken);
      })
      .compile();

    service = module.get<SpaceService>(SpaceService);
  });

  it('Sorting test', () => {
    const activeDemoSpaces = getFilteredSpaces(spaceTestData, [
      SpaceVisibility.ACTIVE,
      SpaceVisibility.DEMO,
    ]);
    const result = service['sortSpacesDefault'](activeDemoSpaces);
    expect(JSON.stringify(result)).toBe(
      '["6","2","1","5","9","3","8","4","10"]'
    );
  });
  it('Sorting test with INACTIVE spaces deprioritized alongside DEMO', () => {
    const activeDemoInactiveSpaces = getFilteredSpaces(spaceTestData, [
      SpaceVisibility.ACTIVE,
      SpaceVisibility.DEMO,
      SpaceVisibility.INACTIVE,
    ]);
    const result = service['sortSpacesDefault'](activeDemoInactiveSpaces);
    // Active spaces first (sorted by public-first, then subspace count), then Demo + Inactive deprioritized
    expect(JSON.stringify(result)).toBe(
      '["6","2","1","5","9","3","11","8","4","10","12"]'
    );
  });
  it('Filtering test 1', () => {
    const activeSpaces = getFilteredSpaces(spaceTestData, [
      SpaceVisibility.ACTIVE,
    ]);
    const result = service['sortSpacesDefault'](activeSpaces);

    expect(JSON.stringify(result)).toBe('["6","2","1","5","9"]');
  });
  it('Filtering test 2', () => {
    const demoSpaces = getFilteredSpaces(spaceTestData, [SpaceVisibility.DEMO]);
    const result = service['sortSpacesDefault'](demoSpaces);
    expect(JSON.stringify(result)).toBe('["3","8","4","10"]');
  });
  it('Filtering test 3', () => {
    const archivedSpaces = getFilteredSpaces(spaceTestData, [
      SpaceVisibility.ARCHIVED,
    ]);
    const result = service['sortSpacesDefault'](archivedSpaces);
    expect(JSON.stringify(result)).toBe('["7"]');
  });
  it('Filtering INACTIVE spaces only', () => {
    const inactiveSpaces = getFilteredSpaces(spaceTestData, [
      SpaceVisibility.INACTIVE,
    ]);
    const result = service['sortSpacesDefault'](inactiveSpaces);
    expect(JSON.stringify(result)).toBe('["11","12"]');
  });
});

/**
 * @returns common properties that all BaseEntity have
 */
const getEntityMock = <T>() => ({
  createdDate: new Date(),
  updatedDate: new Date(),
  hasId: (): boolean => {
    throw new Error('Function not implemented.');
  },
  save: (): Promise<T> => {
    throw new Error('Function not implemented.');
  },
  remove: (): Promise<T> => {
    throw new Error('Function not implemented.');
  },
  softRemove: (): Promise<T> => {
    throw new Error('Function not implemented.');
  },
  recover: (): Promise<T> => {
    throw new Error('Function not implemented.');
  },
  reload: (): Promise<void> => {
    throw new Error('Function not implemented.');
  },
});

const getAuthorizationPolicyMock = (id: string): AuthorizationPolicy => ({
  id,
  credentialRules: [],
  privilegeRules: [],
  type: AuthorizationPolicyType.SPACE,
  ...getEntityMock<AuthorizationPolicy>(),
});

const spaceSettings = {
  privacy: {
    mode: SpacePrivacyMode.PUBLIC,
    allowPlatformSupportAsAdmin: false,
  },
  membership: {
    policy: CommunityMembershipPolicy.OPEN,
    trustedOrganizations: [],
    allowSubspaceAdminsToInviteMembers: false,
  },
  collaboration: {
    inheritMembershipRights: true,
    allowMembersToCreateSubspaces: true,
    allowMembersToCreateCallouts: true,
    allowEventsFromSubspaces: true,
    allowMembersToVideoCall: false,
    allowGuestContributions: false,
  },
  sortMode: SpaceSortMode.ALPHABETICAL,
  layout: {
    calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
  },
};

const getSubspacesMock = (
  spaceId: string,
  count: number,
  subsubspaceCount: number[]
): Space[] => {
  const result: Space[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      type: ActorType.SPACE,
      id: `${spaceId}.${i}`,
      rowId: i,
      nameID: `challenge-${spaceId}.${i}`,
      settings: spaceSettings,
      levelZeroSpaceID: spaceId,
      sortOrder: i,
      pinned: false,
      platformRolesAccess: {
        roles: [],
      },
      profile: {
        id: `profile-space-${spaceId}.${i}`,
        displayName: `Challenge ${spaceId}.${i}`,
        type: ProfileType.SPACE,
        ...getEntityMock<Profile>(),
      },
      account: {
        id: `account-${spaceId}.${i}`,
        nameID: `account-nameid-${spaceId}.${i}`,
        accountType: AccountType.ORGANIZATION,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        spaces: [],
        externalSubscriptionID: '',
        type: ActorType.ORGANIZATION,
        authorization: getAuthorizationPolicyMock(
          `account-auth-${spaceId}.${i}`
        ),
        credentials: [],
        ...getEntityMock<Account>(),
        baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
        profile: {
          id: `profile-account-${spaceId}.${i}`,
          displayName: `Account ${spaceId}.${i}`,
          type: ProfileType.ACCOUNT,
          ...getEntityMock<Profile>(),
        },
      },
      level: SpaceLevel.L1,
      visibility: SpaceVisibility.ACTIVE,
      collaboration: {
        id: '',
        isTemplate: false,
        calloutsSet: {
          id: '',
          callouts: [],
          type: CalloutsSetType.COLLABORATION,
          ...getEntityMock<CalloutsSet>(),
        },
        innovationFlow: {
          id: '',
          settings: {
            maximumNumberOfStates: 8,
            minimumNumberOfStates: 1,
          },
          flowStatesTagsetTemplate: {
            id: '',
            allowedValues: [],
            name: '',
            type: TagsetType.SELECT_ONE,
            ...getEntityMock<TagsetTemplate>(),
          },
          states: [
            {
              displayName: 'prepare',
              description: 'The innovation is being prepared.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
            {
              displayName: 'in progress',
              description: 'The innovation is in progress.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
            {
              displayName: 'summary',
              description: 'The summary of the flow results.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
            {
              displayName: 'done',
              description: 'The flow is completed.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
          ],
          currentStateID: '',
          profile: {
            id: '',
            displayName: `Challenge ${spaceId}.${i}`,
            tagline: '',
            description: '',
            type: ProfileType.SPACE_ABOUT,
            ...getEntityMock<Profile>(),
          },
          ...getEntityMock<InnovationFlow>(),
        },
        ...getEntityMock<Collaboration>(),
      },
      about: {
        id: '',
        profile: {
          id: `profile-challenge-${spaceId}.${i}`,
          displayName: `Challenge ${spaceId}.${i}`,
          tagline: '',
          description: '',
          type: ProfileType.SPACE_ABOUT,
          ...getEntityMock<Profile>(),
        },
        ...getEntityMock<SpaceAbout>(),
      },
      subspaces: getSubsubspacesMock(
        `${spaceId}.${i}`,
        subsubspaceCount[i] ?? 0
      ),
      authorization: getAuthorizationPolicyMock(`space-auth-${spaceId}.${i}`),
      credentials: [],
      ...getEntityMock<Space>(),
    });
  }
  return result;
};

const getSubsubspacesMock = (subsubspaceId: string, count: number): Space[] => {
  const result: Space[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      type: ActorType.SPACE,
      id: `${subsubspaceId}.${i}`,
      rowId: i,
      nameID: `subsubspace-${subsubspaceId}.${i}`,
      settings: spaceSettings,
      levelZeroSpaceID: subsubspaceId,
      sortOrder: i,
      pinned: false,
      platformRolesAccess: {
        roles: [],
      },
      profile: {
        id: `profile-space-${subsubspaceId}.${i}`,
        displayName: `Subsubspace ${subsubspaceId}.${i}`,
        type: ProfileType.SPACE,
        ...getEntityMock<Profile>(),
      },
      account: {
        id: `account-${subsubspaceId}.${i}`,
        nameID: `account-nameid-${subsubspaceId}.${i}`,
        accountType: AccountType.ORGANIZATION,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        spaces: [],
        externalSubscriptionID: '',
        type: ActorType.ORGANIZATION,
        authorization: getAuthorizationPolicyMock(
          `account-auth-${subsubspaceId}.${i}`
        ),
        credentials: [],
        ...getEntityMock<Account>(),
        baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
        profile: {
          id: `profile-account-${subsubspaceId}.${i}`,
          displayName: `Account ${subsubspaceId}.${i}`,
          type: ProfileType.ACCOUNT,
          ...getEntityMock<Profile>(),
        },
      },
      level: SpaceLevel.L2,
      visibility: SpaceVisibility.ACTIVE,
      collaboration: {
        id: '',
        isTemplate: false,
        calloutsSet: {
          id: '',
          callouts: [],
          type: CalloutsSetType.COLLABORATION,
          ...getEntityMock<CalloutsSet>(),
        },
        innovationFlow: {
          id: '',
          settings: {
            maximumNumberOfStates: 8,
            minimumNumberOfStates: 1,
          },
          flowStatesTagsetTemplate: {
            id: '',
            name: '',
            type: TagsetType.SELECT_ONE,
            allowedValues: [],
            ...getEntityMock<TagsetTemplate>(),
          },
          currentStateID: '',
          states: [
            {
              displayName: 'prepare',
              description: 'The innovation is being prepared.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
            {
              displayName: 'in progress',
              description: 'The innovation is in progress.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
            {
              displayName: 'summary',
              description: 'The summary of the flow results.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
            {
              displayName: 'done',
              description: 'The flow is completed.',
              id: '',
              settings: {
                allowNewCallouts: true,
              },
              sortOrder: 1,
              ...getEntityMock<InnovationFlowState>(),
            },
          ],
          profile: {
            id: '',
            displayName: `subsubspace-${subsubspaceId}.${i}`,
            tagline: '',
            description: '',
            type: ProfileType.INNOVATION_FLOW,
            ...getEntityMock<Profile>(),
          },
          ...getEntityMock<InnovationFlow>(),
        },
        ...getEntityMock<Collaboration>(),
      },
      about: {
        id: '',
        profile: {
          id: `profile-challenge-${subsubspaceId}.${i}`,
          displayName: `Challenge ${subsubspaceId}.${i}`,
          tagline: '',
          description: '',
          type: ProfileType.SPACE_ABOUT,
          ...getEntityMock<Profile>(),
        },
        ...getEntityMock<SpaceAbout>(),
      },
      authorization: getAuthorizationPolicyMock(
        `space-auth-${subsubspaceId}.${i}`
      ),
      credentials: [],
      ...getEntityMock<Space>(),
    });
  }
  return result;
};

const getSpaceMock = ({
  id,
  visibility,
  challengesCount,
  opportunitiesCounts,
  settings,
}: {
  id: string;
  visibility: SpaceVisibility;
  challengesCount: number;
  opportunitiesCounts: number[];
  settings: ISpaceSettings;
}): Space => {
  return {
    type: ActorType.SPACE,
    id,
    rowId: parseInt(id),
    nameID: `space-${id}`,
    settings: settings,
    levelZeroSpaceID: '',
    sortOrder: 0,
    pinned: false,
    platformRolesAccess: {
      roles: [],
    },
    profile: {
      id: `profile-space-${id}`,
      displayName: `Space ${id}`,
      type: ProfileType.SPACE,
      ...getEntityMock<Profile>(),
    },
    about: {
      id: '',
      profile: {
        id: `profile-${id}`,
        displayName: `Space ${id}`,
        tagline: '',
        description: '',
        type: ProfileType.SPACE_ABOUT,
        ...getEntityMock<Profile>(),
      },
      ...getEntityMock<SpaceAbout>(),
    },
    level: 0,
    visibility,
    account: {
      id: `account-${id}`,
      nameID: `account-nameid-${id}`,
      accountType: AccountType.ORGANIZATION,
      virtualContributors: [],
      innovationHubs: [],
      innovationPacks: [],
      spaces: [],
      externalSubscriptionID: '',
      type: ActorType.ORGANIZATION,
      authorization: getAuthorizationPolicyMock(`account-auth-${id}`),
      credentials: [],
      ...getEntityMock<Account>(),
      baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
      profile: {
        id: `profile-account-${id}`,
        displayName: `Account ${id}`,
        type: ProfileType.ACCOUNT,
        ...getEntityMock<Profile>(),
      },
    },
    authorization: getAuthorizationPolicyMock(`auth-${id}`),
    credentials: [],
    subspaces: getSubspacesMock(id, challengesCount, opportunitiesCounts),
    ...getEntityMock<Space>(),
  };
};

const getFilteredSpaces = (
  spaces: Space[],
  visibilities: SpaceVisibility[]
): Space[] => {
  return spaces.filter(space => {
    const visibility = space.visibility || SpaceVisibility.ACTIVE;
    return visibilities.includes(visibility);
  });
};

const spaceTestData: Space[] = [
  getSpaceMock({
    id: '1',
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [5],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '2',
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 2,
    opportunitiesCounts: [5, 3],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '3',
    visibility: SpaceVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [5, 3, 1],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '4',
    visibility: SpaceVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 1],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '5',
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [1],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '6',
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 3,
    opportunitiesCounts: [1, 1, 6],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '7',
    visibility: SpaceVisibility.ARCHIVED,
    challengesCount: 0,
    opportunitiesCounts: [],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '8',
    visibility: SpaceVisibility.DEMO,
    challengesCount: 0,
    opportunitiesCounts: [],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '9',
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 0,
    opportunitiesCounts: [],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '10',
    visibility: SpaceVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 0],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '11',
    visibility: SpaceVisibility.INACTIVE,
    challengesCount: 2,
    opportunitiesCounts: [3, 1],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
  getSpaceMock({
    id: '12',
    visibility: SpaceVisibility.INACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [2],
    settings: {
      ...spaceSettings,
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
    },
  }),
];
