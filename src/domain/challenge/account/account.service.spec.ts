import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Account } from './account.entity';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { AccountVisibility } from '@common/enums/account.visibility';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { Profile } from '@domain/common/profile';
import { Challenge } from '../challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity';
import { AccountFilterService } from '@services/infrastructure/account-filter/account.filter.service';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { InnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.entity';
import { ProfileType } from '@common/enums';
import { License } from '@domain/license/license/license.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';

const moduleMocker = new ModuleMocker(global);

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Account),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<AccountService>(AccountService);
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
  accountId: string,
  count: number,
  opportunityCount: number[]
): Challenge[] => {
  const result: Challenge[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `${accountId}.${i}`,
      rowId: i,
      nameID: `challenge-${accountId}.${i}`,
      accountID: `${accountId}`,
      collaboration: {
        id: '',
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
            displayName: `Challenge ${accountId}.${i}`,
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
        id: `profile-challenge-${accountId}.${i}`,
        displayName: `Challenge ${accountId}.${i}`,
        tagline: '',
        description: '',
        type: ProfileType.CHALLENGE,
        ...getEntityMock<Profile>(),
      },
      opportunities: getOpportunitiesMock(
        `${accountId}.${i}`,
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
      accountID: `${challengeId}`,
      collaboration: {
        id: '',
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

const getAccountMock = ({
  id,
  visibility,
  anonymousReadAccess,
  challengesCount,
  opportunitiesCounts,
}: {
  id: string;
  visibility: AccountVisibility;
  anonymousReadAccess: boolean;
  challengesCount: number;
  opportunitiesCounts: number[];
}): Account => {
  return {
    id,
    rowId: parseInt(id),
    nameID: `account-${id}`,
    profile: {
      id: `profile-${id}`,
      displayName: `Account ${id}`,
      tagline: '',
      description: '',
      type: ProfileType.SPACE,
      ...getEntityMock<Profile>(),
    },
    license: {
      id,
      visibility,
      featureFlags: [],
      ...getEntityMock<License>(),
    },
    authorization: getAuthorizationPolicyMock(
      `auth-${id}`,
      anonymousReadAccess
    ),
    challenges: getChallengesMock(id, challengesCount, opportunitiesCounts),
    ...getEntityMock<Account>(),
  };
};

const getFilteredAccounts = (
  accounts: Account[],
  visibilities: AccountVisibility[]
): Account[] => {
  return accounts.filter(account => {
    const visibility = account.license?.visibility || AccountVisibility.ACTIVE;
    return visibilities.includes(visibility);
  });
};

const accountTestData: Account[] = [
  getAccountMock({
    id: '1',
    anonymousReadAccess: true,
    visibility: AccountVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [5],
  }),
  getAccountMock({
    id: '2',
    anonymousReadAccess: true,
    visibility: AccountVisibility.ACTIVE,
    challengesCount: 2,
    opportunitiesCounts: [5, 3],
  }),
  getAccountMock({
    id: '3',
    anonymousReadAccess: true,
    visibility: AccountVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [5, 3, 1],
  }),
  getAccountMock({
    id: '4',
    anonymousReadAccess: false,
    visibility: AccountVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 1],
  }),
  getAccountMock({
    id: '5',
    anonymousReadAccess: false,
    visibility: AccountVisibility.ACTIVE,
    challengesCount: 1,
    opportunitiesCounts: [1],
  }),
  getAccountMock({
    id: '6',
    anonymousReadAccess: true,
    visibility: AccountVisibility.ACTIVE,
    challengesCount: 3,
    opportunitiesCounts: [1, 1, 6],
  }),
  getAccountMock({
    id: '7',
    anonymousReadAccess: true,
    visibility: AccountVisibility.ARCHIVED,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getAccountMock({
    id: '8',
    anonymousReadAccess: true,
    visibility: AccountVisibility.DEMO,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getAccountMock({
    id: '9',
    anonymousReadAccess: false,
    visibility: AccountVisibility.ACTIVE,
    challengesCount: 0,
    opportunitiesCounts: [],
  }),
  getAccountMock({
    id: '10',
    anonymousReadAccess: false,
    visibility: AccountVisibility.DEMO,
    challengesCount: 3,
    opportunitiesCounts: [1, 2, 0],
  }),
];

/**
 * Active accounts go first and then all the Demo accounts
 * In those two groups, Public accounts go first
 * And then they are sorted by number of challenges and number of opportunities
 */
describe('AccountsSorting', () => {
  let service: AccountService;
  let filterService: AccountFilterService;

  beforeEach(async () => {
    const filterModule: TestingModule = await Test.createTestingModule({
      providers: [AccountFilterService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    filterService =
      filterModule.get<AccountFilterService>(AccountFilterService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Account),
      ],
    })
      .useMocker(injectionToken => {
        // AccountFilterService should be a real one and not mocked.
        if (typeof injectionToken === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            injectionToken
          ) as MockFunctionMetadata<any, any>;
          if (mockMetadata.name === 'AccountFilterService') {
            return filterService;
          }
        }
        // The rest of the dependencies can be mocks
        return defaultMockerFactory(injectionToken);
      })
      .compile();

    service = module.get<AccountService>(AccountService);
  });

  it('Sorting test', () => {
    const activeDemoAccounts = getFilteredAccounts(accountTestData, [
      AccountVisibility.ACTIVE,
      AccountVisibility.DEMO,
    ]);
    const result = service['sortAccountsDefault'](activeDemoAccounts);
    expect(JSON.stringify(result)).toBe(
      '["6","2","1","5","9","3","8","4","10"]'
    );
  });
  it('Filtering test 1', () => {
    const activeAccounts = getFilteredAccounts(accountTestData, [
      AccountVisibility.ACTIVE,
    ]);
    const result = service['sortAccountsDefault'](activeAccounts);

    expect(JSON.stringify(result)).toBe('["6","2","1","5","9"]');
  });
  it('Filtering test 2', () => {
    const demoAccounts = getFilteredAccounts(accountTestData, [
      AccountVisibility.DEMO,
    ]);
    const result = service['sortAccountsDefault'](demoAccounts);
    expect(JSON.stringify(result)).toBe('["3","8","4","10"]');
  });
  it('Filtering test 3', () => {
    const archivedAccounts = getFilteredAccounts(accountTestData, [
      AccountVisibility.ARCHIVED,
    ]);
    const result = service['sortAccountsDefault'](archivedAccounts);
    expect(JSON.stringify(result)).toBe('["7"]');
  });
});
