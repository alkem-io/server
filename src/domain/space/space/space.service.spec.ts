import { vi, type Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SpaceService } from './space.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Space } from './space.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { Profile } from '@domain/common/profile';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { InnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.entity';
import { AuthorizationPrivilege, ProfileType } from '@common/enums';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Account } from '../account/account.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AccountType } from '@common/enums/account.type';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { CalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.entity';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { SpaceAbout } from '../space.about';
import { TagsetTemplate } from '@domain/common/tagset-template';
import { TagsetType } from '@common/enums/tagset.type';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { InnovationFlowState } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.entity';
import { DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN } from '../account/constants';
import { RoleName } from '@common/enums/role.name';

describe('SpaceService', () => {
  let service: SpaceService;
  let spaceRepository: Repository<Space>;
  let urlGeneratorCacheService: UrlGeneratorCacheService;

  beforeEach(async () => {
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
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([mockSubspace]);
      vi.spyOn(service, 'save').mockResolvedValue(mockSpace);

      // Mock the URL cache service - use direct assignment for mock objects
      const revokeUrlCacheSpy = vi.fn().mockResolvedValue(undefined);
      urlGeneratorCacheService.revokeUrlCache = revokeUrlCacheSpy;

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
      vi.spyOn(spaceRepository, 'find').mockResolvedValue([mockChildSubspace]);
      vi.spyOn(service, 'save').mockResolvedValue(mockSubspace);

      // Mock the URL cache service - use direct assignment for mock objects
      const revokeUrlCacheSpy = vi.fn().mockResolvedValue(undefined);
      urlGeneratorCacheService.revokeUrlCache = revokeUrlCacheSpy;

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
});

/**
 * @returns common properties that all BaseEntity have
 */
const getEntityMock = <T>() => ({
  createdDate: new Date(),
  updatedDate: new Date(),
  hasId: function (): boolean {
    throw new Error('Function not implemented.');
  },
  save: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  remove: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  softRemove: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  recover: function (): Promise<T> {
    throw new Error('Function not implemented.');
  },
  reload: function (): Promise<void> {
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
};

const getSubspacesMock = (
  spaceId: string,
  count: number,
  subsubspaceCount: number[]
): Space[] => {
  const result: Space[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `${spaceId}.${i}`,
      rowId: i,
      nameID: `challenge-${spaceId}.${i}`,
      settings: spaceSettings,
      levelZeroSpaceID: spaceId,
      platformRolesAccess: {
        roles: [],
      },
      account: {
        id: `account-${spaceId}.${i}`,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        spaces: [],
        externalSubscriptionID: '',
        type: AccountType.ORGANIZATION,
        ...getEntityMock<Account>(),
        baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
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
      ...getEntityMock<Space>(),
    });
  }
  return result;
};

const getSubsubspacesMock = (subsubspaceId: string, count: number): Space[] => {
  const result: Space[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `${subsubspaceId}.${i}`,
      rowId: i,
      nameID: `subsubspace-${subsubspaceId}.${i}`,
      settings: spaceSettings,
      levelZeroSpaceID: subsubspaceId,
      platformRolesAccess: {
        roles: [],
      },
      account: {
        id: `account-${subsubspaceId}.${i}`,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        spaces: [],
        externalSubscriptionID: '',
        type: AccountType.ORGANIZATION,
        ...getEntityMock<Account>(),
        baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
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
    id,
    rowId: parseInt(id),
    nameID: `space-${id}`,
    settings: settings,
    levelZeroSpaceID: '',
    platformRolesAccess: {
      roles: [],
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
      virtualContributors: [],
      innovationHubs: [],
      innovationPacks: [],
      spaces: [],
      externalSubscriptionID: '',
      type: AccountType.ORGANIZATION,
      ...getEntityMock<Account>(),
      baselineLicensePlan: DEFAULT_BASELINE_ACCOUNT_LICENSE_PLAN,
    },
    authorization: getAuthorizationPolicyMock(`auth-${id}`),
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
];
