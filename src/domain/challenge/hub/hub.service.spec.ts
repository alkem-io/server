import { Test, TestingModule } from '@nestjs/testing';
import { HubService } from './hub.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Hub } from './hub.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { HubVisibility } from '@common/enums/hub.visibility';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { Profile } from '@domain/common/profile';
import { Lifecycle } from '@domain/common/lifecycle';
import { Challenge } from '../challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { HubFilterService } from '@services/infrastructure/hub-filter/hub.filter.service';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';

const moduleMocker = new ModuleMocker(global);

describe('HubService', () => {
  let service: HubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Hub),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<HubService>(HubService);
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
  hubId: string,
  count: number,
  opportunityCount: number[]
): Challenge[] => {
  const result: Challenge[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `${hubId}.${i}`,
      nameID: `challenge-${hubId}.${i}`,
      lifecycle: {
        id: `lifecycle-${i}`,
        machineDef: '',
        ...getEntityMock<Lifecycle>(),
      },
      profile: {
        id: `profile-challenge-${hubId}.${i}`,
        displayName: `Challenge ${hubId}.${i}`,
        tagline: '',
        description: '',
        ...getEntityMock<Profile>(),
      },
      opportunities: getOpportunitiesMock(
        `${hubId}.${i}`,
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
      nameID: `opportunity-${challengeId}.${i}`,
      lifecycle: {
        id: `lifecycle-${i}`,
        machineDef: '',
        ...getEntityMock<Lifecycle>(),
      },
      profile: {
        id: `profile-challenge-${challengeId}.${i}`,
        displayName: `Challenge ${challengeId}.${i}`,
        tagline: '',
        description: '',
        ...getEntityMock<Profile>(),
      },
      ...getEntityMock<Challenge>(),
    });
  }
  return result;
};

const getHubMock = ({
  id,
  visibility,
  anonymousReadAccess,
  challengesCount,
  opportunitiesCounts,
}: {
  id: string;
  visibility: HubVisibility;
  anonymousReadAccess: boolean;
  challengesCount: number;
  opportunitiesCounts: number[];
}): Hub => {
  return {
    id,
    nameID: `hub-${id}`,
    profile: {
      id: `profile-${id}`,
      displayName: `Hub ${id}`,
      tagline: '',
      description: '',
      ...getEntityMock<Profile>(),
    },
    visibility,
    authorization: getAuthorizationPolicyMock(
      `auth-${id}`,
      anonymousReadAccess
    ),
    lifecycle: {
      id: `lifecycle-${id}`,
      machineDef: '',
      ...getEntityMock<Lifecycle>(),
    },
    challenges: getChallengesMock(id, challengesCount, opportunitiesCounts),
    ...getEntityMock<Hub>(),
  };
};

const hubTestData: Hub[] = [
  getHubMock({
    id: '1',
    anonymousReadAccess: true,
    visibility: HubVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [5],
  }),
  getHubMock({
    id: '2',
    anonymousReadAccess: true,
    visibility: HubVisibility.ACTIVE,
    challengesCount: 2,
    opportunitiesCounts: [5, 3],
  }),
  getHubMock({
    id: '3',
    anonymousReadAccess: true,
    visibility: HubVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [5, 3, 1],
  }),
  getHubMock({
    id: '4',
    anonymousReadAccess: false,
    visibility: HubVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 1],
  }),
  getHubMock({
    id: '5',
    anonymousReadAccess: false,
    visibility: HubVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [1],
  }),
  getHubMock({
    id: '6',
    anonymousReadAccess: true,
    visibility: HubVisibility.ACTIVE,
    challengesCount: 3,
    opportunitiesCounts: [1, 1, 6],
  }),
  getHubMock({
    id: '7',
    anonymousReadAccess: true,
    visibility: HubVisibility.ARCHIVED,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getHubMock({
    id: '8',
    anonymousReadAccess: true,
    visibility: HubVisibility.DEMO,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getHubMock({
    id: '9',
    anonymousReadAccess: false,
    visibility: HubVisibility.ACTIVE,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getHubMock({
    id: '10',
    anonymousReadAccess: false,
    visibility: HubVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 0],
  }),
];

/**
 * Active hubs go first and then all the Demo hubs
 * In those two groups, Public hubs go first
 * And then they are sorted by number of challenges and number of opportunities
 */
describe('HubsSorting', () => {
  let service: HubService;
  let filterService: HubFilterService;

  beforeEach(async () => {
    const filterModule: TestingModule = await Test.createTestingModule({
      providers: [HubFilterService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    filterService = filterModule.get<HubFilterService>(HubFilterService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Hub),
      ],
    })
      .useMocker(injectionToken => {
        // HubFilterService should be a real one and not mocked.
        if (typeof injectionToken === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            injectionToken
          ) as MockFunctionMetadata<any, any>;
          if (mockMetadata.name === 'HubFilterService') {
            return filterService;
          }
        }
        // The rest of the dependencies can be mocks
        return defaultMockerFactory(injectionToken);
      })
      .compile();

    service = module.get<HubService>(HubService);
  });

  it('Sorting test', () => {
    const result = service['filterAndSortHubs'](hubTestData, [
      HubVisibility.ACTIVE,
      HubVisibility.DEMO,
    ]);
    expect(JSON.stringify(result)).toBe(
      '["6","2","1","5","9","3","8","4","10"]'
    );
  });
  it('Filtering test 1', () => {
    const result = service['filterAndSortHubs'](hubTestData, [
      HubVisibility.ACTIVE,
    ]);

    expect(JSON.stringify(result)).toBe('["6","2","1","5","9"]');
  });
  it('Filtering test 2', () => {
    const result = service['filterAndSortHubs'](hubTestData, [
      HubVisibility.DEMO,
    ]);
    expect(JSON.stringify(result)).toBe('["3","8","4","10"]');
  });
  it('Filtering test 3', () => {
    const result = service['filterAndSortHubs'](hubTestData, [
      HubVisibility.ARCHIVED,
    ]);
    expect(JSON.stringify(result)).toBe('["7"]');
  });
});
