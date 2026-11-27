import { randomUUID } from 'node:crypto';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { DocumentAuthorizationService } from '../document/document.service.authorization';
import { StorageBucketAuthorizationService } from '../storage-bucket/storage.bucket.service.authorization';
import { IStorageAggregator } from './storage.aggregator.interface';
import { StorageAggregatorService } from './storage.aggregator.service';
import { StorageAggregatorAuthorizationService } from './storage.aggregator.service.authorization';

describe('StorageAggregatorAuthorizationService', () => {
  let service: StorageAggregatorAuthorizationService;
  let storageAggregatorService: StorageAggregatorService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageAggregatorAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<StorageAggregatorAuthorizationService>(
      StorageAggregatorAuthorizationService
    );
    storageAggregatorService = module.get<StorageAggregatorService>(
      StorageAggregatorService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should throw RelationshipNotFoundException when directStorage is missing', async () => {
      const aggregatorInput = { id: 'agg-2' } as IStorageAggregator;
      (
        storageAggregatorService.getStorageAggregatorOrFail as Mock
      ).mockResolvedValue({
        id: 'agg-2',
        authorization: { id: 'auth-2' },
        directStorage: undefined,
      });

      await expect(
        service.applyAuthorizationPolicy(aggregatorInput, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const aggregatorInput = { id: 'agg-3' } as IStorageAggregator;
      (
        storageAggregatorService.getStorageAggregatorOrFail as Mock
      ).mockResolvedValue({
        id: 'agg-3',
        authorization: undefined,
        directStorage: { id: 'bucket-3' },
      });

      await expect(
        service.applyAuthorizationPolicy(aggregatorInput, undefined)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});

/**
 * Storage read follows the owner's policy. These cases run the aggregator,
 * its direct bucket and a document in it through the real policy services
 * (only the aggregator loader is replaced), then evaluate READ on the
 * resulting policies the way every access check does.
 */
describe('StorageAggregatorAuthorizationService — storage read follows the owner policy', () => {
  const ownerID = randomUUID();
  const memberCredential: ICredentialDefinition = {
    type: AuthorizationCredential.SPACE_MEMBER,
    resourceID: ownerID,
  };
  const anonymous: ICredentialDefinition[] = [
    { type: AuthorizationCredential.GLOBAL_ANONYMOUS, resourceID: '' },
  ];
  const registeredNonMember: ICredentialDefinition[] = [
    { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
    {
      type: AuthorizationCredential.USER_SELF_MANAGEMENT,
      resourceID: randomUUID(),
    },
  ];
  const member: ICredentialDefinition[] = [
    ...registeredNonMember,
    memberCredential,
  ];

  const silentLogger = {} as any;
  const authorizationService = new AuthorizationService(silentLogger);
  const policies = new AuthorizationPolicyService(
    { save: async (policy: unknown) => policy } as any,
    authorizationService,
    silentLogger,
    { get: () => 500 } as any
  );

  type StoragePolicies = {
    aggregator: IAuthorizationPolicy;
    bucket: IAuthorizationPolicy;
    document: IAuthorizationPolicy;
  };

  const applyUnder = async (
    ownerPolicy: IAuthorizationPolicy
  ): Promise<StoragePolicies> => {
    const document = {
      id: randomUUID(),
      createdBy: randomUUID(),
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.DOCUMENT),
      tagset: null,
    };
    const directStorage = {
      id: randomUUID(),
      authorization: new AuthorizationPolicy(
        AuthorizationPolicyType.STORAGE_BUCKET
      ),
      documents: [document],
    };
    const aggregator = {
      id: randomUUID(),
      authorization: new AuthorizationPolicy(
        AuthorizationPolicyType.STORAGE_AGGREGATOR
      ),
      directStorage,
    };
    const loader = {
      getStorageAggregatorOrFail: async () => aggregator,
    } as unknown as StorageAggregatorService;
    const subject = new StorageAggregatorAuthorizationService(
      policies,
      loader,
      new StorageBucketAuthorizationService(
        policies,
        new DocumentAuthorizationService(policies)
      )
    );

    await subject.applyAuthorizationPolicy(
      { id: aggregator.id } as IStorageAggregator,
      ownerPolicy
    );

    return {
      aggregator: aggregator.authorization,
      bucket: directStorage.authorization,
      document: document.authorization,
    };
  };

  const canRead = (
    credentials: ICredentialDefinition[],
    policy: IAuthorizationPolicy
  ): boolean =>
    authorizationService.isAccessGrantedForCredentials(
      credentials,
      policy,
      AuthorizationPrivilege.READ
    );

  const membersOnlyOwnerPolicy = (): IAuthorizationPolicy => {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.SPACE);
    const membersRead = policies.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [memberCredential],
      'Space members read'
    );
    membersRead.cascade = true;
    policy.credentialRules.push(membersRead);
    return policy;
  };

  const publicOwnerPolicy = (): IAuthorizationPolicy => {
    const policy = membersOnlyOwnerPolicy();
    const publicRead = policies.createCredentialRule(
      [AuthorizationPrivilege.READ],
      policies.getCredentialDefinitionsAnonymousRegistered(),
      'Public spaces content is visible to all'
    );
    publicRead.cascade = true;
    policy.credentialRules.push(publicRead);
    return policy;
  };

  describe('when the owner grants READ only to its members', () => {
    it.each([
      'aggregator',
      'bucket',
      'document',
    ] as const)('the %s is not readable without a session', async target => {
      const storage = await applyUnder(membersOnlyOwnerPolicy());
      expect(canRead(anonymous, storage[target])).toBe(false);
    });

    it.each([
      'aggregator',
      'bucket',
      'document',
    ] as const)('the %s is not readable by a registered non-member', async target => {
      const storage = await applyUnder(membersOnlyOwnerPolicy());
      expect(canRead(registeredNonMember, storage[target])).toBe(false);
    });

    it.each([
      'aggregator',
      'bucket',
      'document',
    ] as const)('the %s is readable by a member', async target => {
      const storage = await applyUnder(membersOnlyOwnerPolicy());
      expect(canRead(member, storage[target])).toBe(true);
    });
  });

  describe('when the owner makes its content public', () => {
    it.each([
      'aggregator',
      'bucket',
      'document',
    ] as const)('the %s is readable without a session and by any registered user', async target => {
      const storage = await applyUnder(publicOwnerPolicy());
      expect(canRead(anonymous, storage[target])).toBe(true);
      expect(canRead(registeredNonMember, storage[target])).toBe(true);
    });
  });
});
