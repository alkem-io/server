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
import { Opportunity } from '@domain/challenge/opportunity';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { InnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.entity';
import { ProfileType } from '@common/enums';
import { License } from '@domain/license/license/license.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Account } from '../account/account.entity';
import { SpaceType } from '@common/enums/space.type';

const moduleMocker = new ModuleMocker(global);

describe('SpaceService', () => {
  let service: SpaceService;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
  verifiedCredentialRules: '',
  ...getEntityMock<AuthorizationPolicy>(),
});

const getChallengesMock = (
  spaceId: string,
  count: number,
  opportunityCount: number[]
): Challenge[] => {
  const result: Challenge[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `${spaceId}.${i}`,
      rowId: i,
      nameID: `challenge-${spaceId}.${i}`,
      settingsStr: JSON.stringify({}),
      account: {
        id: `account-${spaceId}.${i}`,
        space: {
          id: `${spaceId}`,
          ...getEntityMock<Space>(),
        },
        ...getEntityMock<Account>(),
      },
      type: SpaceType.SPACE,
      collaboration: {
        id: '',
        groupsStr: JSON.stringify([
          {
            displayName: 'HOME_1',
            description: 'The left column on the Home page.',
          },
          {
            displayName: 'HOME_2',
            description: 'The right column on the Home page.',
          },
          {
            displayName: 'COMMUNITY_1',
            description: 'The left column on the Community page.',
          },
          {
            displayName: 'COMMUNITY_2',
            description: 'The right column on the Community page.',
          },
          {
            displayName: 'SUBSPACES_1',
            description: 'The left column on the Subspaces page.',
          },
          {
            displayName: 'SUBSPACES_2',
            description: 'The right column on the Subspaces page.',
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
      opportunities: getOpportunitiesMock(
        `${spaceId}.${i}`,
        opportunityCount[i] ?? 0
      ),
      ...getEntityMock<Challenge>(),
    });
  }
  return result;
};

const getOpportunitiesMock = (
  challengeId: string,
  count: number
): Opportunity[] => {
  const result: Opportunity[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `${challengeId}.${i}`,
      rowId: i,
      nameID: `opportunity-${challengeId}.${i}`,
      settingsStr: JSON.stringify({}),
      account: {
        id: `account-${challengeId}.${i}`,
        spaceID: `account-spaceID-${challengeId}.${i}`,
        ...getEntityMock<Account>(),
      },
      type: SpaceType.OPPORTUNITY,
      collaboration: {
        id: '',
        groupsStr: JSON.stringify([
          {
            displayName: 'HOME_1',
            description: 'The left column on the Home page.',
          },
          {
            displayName: 'HOME_2',
            description: 'The right column on the Home page.',
          },
          {
            displayName: 'COMMUNITY_1',
            description: 'The left column on the Community page.',
          },
          {
            displayName: 'COMMUNITY_2',
            description: 'The right column on the Community page.',
          },
          {
            displayName: 'SUBSPACES_1',
            description: 'The left column on the Subspaces page.',
          },
          {
            displayName: 'SUBSPACES_2',
            description: 'The right column on the Subspaces page.',
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
            displayName: `opportunity-${challengeId}.${i}`,
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
        id: `profile-challenge-${challengeId}.${i}`,
        displayName: `Challenge ${challengeId}.${i}`,
        tagline: '',
        description: '',
        type: ProfileType.CHALLENGE,
        ...getEntityMock<Profile>(),
      },
      ...getEntityMock<Challenge>(),
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
    profile: {
      id: `profile-${id}`,
      displayName: `Space ${id}`,
      tagline: '',
      description: '',
      type: ProfileType.SPACE,
      ...getEntityMock<Profile>(),
    },
    type: SpaceType.SPACE,
    account: {
      id: `account-${id}`,
      spaceID: `space-${id}`,
      license: {
        id,
        visibility,
        featureFlags: [],
        ...getEntityMock<License>(),
      },
      ...getEntityMock<Account>(),
    },
    authorization: getAuthorizationPolicyMock(
      `auth-${id}`,
      anonymousReadAccess
    ),
    subspaces: getChallengesMock(id, challengesCount, opportunitiesCounts),
    ...getEntityMock<Space>(),
  };
};

const getFilteredSpaces = (
  spaces: Space[],
  visibilities: SpaceVisibility[]
): Space[] => {
  return spaces.filter(space => {
    const visibility =
      space.account.license?.visibility || SpaceVisibility.ACTIVE;
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
