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
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { InnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.entity';
import { ProfileType } from '@common/enums';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Account } from '../account/account.entity';
import { SpaceType } from '@common/enums/space.type';
import { SpaceLevel } from '@common/enums/space.level';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AccountType } from '@common/enums/account.type';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';

const moduleMocker = new ModuleMocker(global);

describe('SpaceService', () => {
  let service: SpaceService;
  let spaceRepository: Repository<Space>;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldUpdateAuthorizationPolicy', () => {
    it('returns false if there is no difference in settings', async () => {
      const spaceId = '1';
      const settingsData = {
        collaboration: { allowEventsFromSubspaces: true },
      } as ISpaceSettings;
      const space = {
        id: spaceId,
        settingsStr: JSON.stringify(settingsData),
      } as Space;

      jest.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue(space);
      jest.spyOn(service, 'getSettings').mockReturnValue(settingsData);

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
        settingsStr: JSON.stringify(originalSettings),
      } as Space;

      jest.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue(space);
      jest.spyOn(service, 'getSettings').mockReturnValue(originalSettings);

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
        settingsStr: JSON.stringify(originalSettings),
      } as Space;

      jest.spyOn(spaceRepository, 'findOneOrFail').mockResolvedValue(space);
      jest.spyOn(service, 'getSettings').mockReturnValue(originalSettings);

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

      jest
        .spyOn(spaceRepository, 'findOneOrFail')
        .mockRejectedValue(new Error('Space not found'));

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
        if (typeof injectionToken === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            injectionToken
          ) as MockFunctionMetadata<any, any>;
          if (mockMetadata.name === 'SpaceFilterService') {
            return filterService;
          }
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

const getAuthorizationPolicyMock = (
  id: string,
  anonymousReadAccess: boolean
): AuthorizationPolicy => ({
  id,
  anonymousReadAccess,
  credentialRules: '',
  privilegeRules: '',
  type: AuthorizationPolicyType.SPACE,
  verifiedCredentialRules: '',
  ...getEntityMock<AuthorizationPolicy>(),
});

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
      settingsStr: JSON.stringify({}),
      levelZeroSpaceID: spaceId,
      account: {
        id: `account-${spaceId}.${i}`,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        spaces: [],
        type: AccountType.ORGANIZATION,
        ...getEntityMock<Account>(),
      },
      type: SpaceType.CHALLENGE,
      level: SpaceLevel.CHALLENGE,
      visibility: SpaceVisibility.ACTIVE,
      collaboration: {
        id: '',
        isTemplate: false,
        groupsStr: JSON.stringify([
          {
            displayName: 'HOME',
            description: 'The Home page.',
          },
          {
            displayName: 'COMMUNITY',
            description: 'The Community page.',
          },
          {
            displayName: 'SUBSPACES',
            description: 'The Subspaces page.',
          },
          {
            displayName: 'KNOWLEDGE',
            description: 'The knowledge page.',
          },
        ]),
        innovationFlow: {
          id: '',
          states: JSON.stringify([
            {
              displayName: 'prepare',
              description: 'The innovation is being prepared.',
              sortOrder: 1,
            },
            {
              displayName: 'in progress',
              description: 'The innovation is in progress.',
              sortOrder: 2,
            },
            {
              displayName: 'summary',
              description: 'The summary of the flow results.',
              sortOrder: 3,
            },
            {
              displayName: 'done',
              description: 'The flow is completed.',
              sortOrder: 4,
            },
          ]),
          profile: {
            id: '',
            displayName: `Challenge ${spaceId}.${i}`,
            tagline: '',
            description: '',
            type: ProfileType.SPACE,
            ...getEntityMock<Profile>(),
          },
          ...getEntityMock<InnovationFlow>(),
        },
        ...getEntityMock<Collaboration>(),
      },
      profile: {
        id: `profile-challenge-${spaceId}.${i}`,
        displayName: `Challenge ${spaceId}.${i}`,
        tagline: '',
        description: '',
        type: ProfileType.CHALLENGE,
        ...getEntityMock<Profile>(),
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
      settingsStr: JSON.stringify({}),
      levelZeroSpaceID: subsubspaceId,
      account: {
        id: `account-${subsubspaceId}.${i}`,
        virtualContributors: [],
        innovationHubs: [],
        innovationPacks: [],
        spaces: [],
        type: AccountType.ORGANIZATION,
        ...getEntityMock<Account>(),
      },
      type: SpaceType.OPPORTUNITY,
      level: SpaceLevel.OPPORTUNITY,
      visibility: SpaceVisibility.ACTIVE,
      collaboration: {
        id: '',
        isTemplate: false,
        groupsStr: JSON.stringify([
          {
            displayName: 'HOME',
            description: 'The Home page.',
          },
          {
            displayName: 'COMMUNITY',
            description: 'The Community page.',
          },
          {
            displayName: 'SUBSPACES',
            description: 'The Subspaces page.',
          },
          {
            displayName: 'KNOWLEDGE',
            description: 'The knowledge page.',
          },
        ]),
        innovationFlow: {
          id: '',
          states: JSON.stringify([
            {
              displayName: 'prepare',
              description: 'The innovation is being prepared.',
              sortOrder: 1,
            },
            {
              displayName: 'in progress',
              description: 'The innovation is in progress.',
              sortOrder: 2,
            },
            {
              displayName: 'summary',
              description: 'The summary of the flow results.',
              sortOrder: 3,
            },
            {
              displayName: 'done',
              description: 'The flow is completed.',
              sortOrder: 4,
            },
          ]),
          profile: {
            id: '',
            displayName: `subsubspace-${subsubspaceId}.${i}`,
            tagline: '',
            description: '',
            type: ProfileType.OPPORTUNITY,
            ...getEntityMock<Profile>(),
          },
          ...getEntityMock<InnovationFlow>(),
        },
        ...getEntityMock<Collaboration>(),
      },
      profile: {
        id: `profile-challenge-${subsubspaceId}.${i}`,
        displayName: `Challenge ${subsubspaceId}.${i}`,
        tagline: '',
        description: '',
        type: ProfileType.CHALLENGE,
        ...getEntityMock<Profile>(),
      },
      ...getEntityMock<Space>(),
    });
  }
  return result;
};

const getSpaceMock = ({
  id,
  visibility,
  anonymousReadAccess,
  challengesCount,
  opportunitiesCounts,
}: {
  id: string;
  visibility: SpaceVisibility;
  anonymousReadAccess: boolean;
  challengesCount: number;
  opportunitiesCounts: number[];
}): Space => {
  return {
    id,
    rowId: parseInt(id),
    nameID: `space-${id}`,
    settingsStr: JSON.stringify({}),
    levelZeroSpaceID: '',
    profile: {
      id: `profile-${id}`,
      displayName: `Space ${id}`,
      tagline: '',
      description: '',
      type: ProfileType.SPACE,
      ...getEntityMock<Profile>(),
    },
    type: SpaceType.SPACE,
    level: 0,
    visibility,
    account: {
      id: `account-${id}`,
      virtualContributors: [],
      innovationHubs: [],
      innovationPacks: [],
      spaces: [],
      type: AccountType.ORGANIZATION,
      ...getEntityMock<Account>(),
    },
    authorization: getAuthorizationPolicyMock(
      `auth-${id}`,
      anonymousReadAccess
    ),
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
    anonymousReadAccess: true,
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [5],
  }),
  getSpaceMock({
    id: '2',
    anonymousReadAccess: true,
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 2,
    opportunitiesCounts: [5, 3],
  }),
  getSpaceMock({
    id: '3',
    anonymousReadAccess: true,
    visibility: SpaceVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [5, 3, 1],
  }),
  getSpaceMock({
    id: '4',
    anonymousReadAccess: false,
    visibility: SpaceVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 1],
  }),
  getSpaceMock({
    id: '5',
    anonymousReadAccess: false,
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [1],
  }),
  getSpaceMock({
    id: '6',
    anonymousReadAccess: true,
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 3,
    opportunitiesCounts: [1, 1, 6],
  }),
  getSpaceMock({
    id: '7',
    anonymousReadAccess: true,
    visibility: SpaceVisibility.ARCHIVED,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getSpaceMock({
    id: '8',
    anonymousReadAccess: true,
    visibility: SpaceVisibility.DEMO,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getSpaceMock({
    id: '9',
    anonymousReadAccess: false,
    visibility: SpaceVisibility.ACTIVE,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getSpaceMock({
    id: '10',
    anonymousReadAccess: false,
    visibility: SpaceVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 0],
  }),
];
