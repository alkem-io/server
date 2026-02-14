import { UserService } from '@domain/community/user/user.service';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { User } from '@domain/community/user/user.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { type Mock, vi } from 'vitest';
import { AdminAuthenticationIDBackfillService } from './authentication-id-backfill.service';

describe('AdminAuthenticationIDBackfillService', () => {
  let service: AdminAuthenticationIDBackfillService;
  let userService: { createOrLinkUserFromAgentInfo: Mock };
  let kratosService: { getIdentityByEmail: Mock };
  let agentInfoCacheService: { deleteAgentInfoFromCache: Mock };
  let mockEntityManager: {
    createQueryBuilder: Mock;
  };

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'user@test.com',
      authenticationID: '',
      ...overrides,
    }) as User;

  const makeIdentity = (
    id: string,
    email: string,
    verified = true
  ) => ({
    id,
    traits: { email, name: { first: 'F', last: 'L' } },
    verifiable_addresses: [{ via: 'email', verified }],
  });

  // Helper to build a query builder mock that returns the given batch
  const setupQueryBuilder = (batches: User[][]) => {
    let callCount = 0;
    mockEntityManager.createQueryBuilder.mockImplementation(() => {
      const batch = batches[callCount] ?? [];
      callCount++;
      return {
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(batch),
      };
    });
  };

  beforeEach(async () => {
    mockEntityManager = {
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthenticationIDBackfillService,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminAuthenticationIDBackfillService);
    userService = module.get(UserService) as unknown as typeof userService;
    kratosService = module.get(
      KratosService
    ) as unknown as typeof kratosService;
    agentInfoCacheService = module.get(
      AgentInfoCacheService
    ) as unknown as typeof agentInfoCacheService;
  });

  describe('backfillAuthenticationIDs', () => {
    it('should skip users that already have authenticationID', async () => {
      const user = makeUser({ authenticationID: 'existing-auth-id' });
      setupQueryBuilder([[user], []]);

      const result = await service.backfillAuthenticationIDs();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
      expect(kratosService.getIdentityByEmail).not.toHaveBeenCalled();
    });

    it('should skip users when no Kratos identity is found', async () => {
      const user = makeUser({ authenticationID: '' });
      setupQueryBuilder([[user], []]);
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(undefined);

      const result = await service.backfillAuthenticationIDs();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should update user when identity is found and backfill succeeds', async () => {
      const user = makeUser({ id: 'user-1', email: 'u@t.com', authenticationID: '' });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupQueryBuilder([[user], []]);
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(
        identity as any
      );
      vi.mocked(userService.createOrLinkUserFromAgentInfo).mockResolvedValue({
        user: { id: 'user-1', authenticationID: 'kratos-1' },
      } as any);
      vi.mocked(
        agentInfoCacheService.deleteAgentInfoFromCache
      ).mockResolvedValue(undefined as any);

      const result = await service.backfillAuthenticationIDs();

      expect(result.updated).toBe(1);
      expect(agentInfoCacheService.deleteAgentInfoFromCache).toHaveBeenCalledWith(
        'kratos-1'
      );
    });

    it('should skip when createOrLinkUserFromAgentInfo returns a different user ID', async () => {
      const user = makeUser({ id: 'user-1', email: 'u@t.com', authenticationID: '' });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupQueryBuilder([[user], []]);
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(
        identity as any
      );
      vi.mocked(userService.createOrLinkUserFromAgentInfo).mockResolvedValue({
        user: { id: 'different-user-id', authenticationID: 'kratos-1' },
      } as any);

      const result = await service.backfillAuthenticationIDs();

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should skip when authenticationID does not match identity after backfill', async () => {
      const user = makeUser({ id: 'user-1', email: 'u@t.com', authenticationID: '' });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupQueryBuilder([[user], []]);
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(
        identity as any
      );
      vi.mocked(userService.createOrLinkUserFromAgentInfo).mockResolvedValue({
        user: { id: 'user-1', authenticationID: 'wrong-id' },
      } as any);

      const result = await service.backfillAuthenticationIDs();

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should handle createOrLinkUserFromAgentInfo error by skipping user', async () => {
      const user = makeUser({ id: 'user-1', email: 'u@t.com', authenticationID: '' });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupQueryBuilder([[user], []]);
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(
        identity as any
      );
      vi.mocked(userService.createOrLinkUserFromAgentInfo).mockRejectedValue(
        new Error('link error')
      );

      const result = await service.backfillAuthenticationIDs();

      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should return zero counts when no users exist', async () => {
      setupQueryBuilder([[]]);

      const result = await service.backfillAuthenticationIDs();

      expect(result.processed).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should retry a failed batch once and increment retriedBatches on success', async () => {
      const user = makeUser({ id: 'user-1', email: 'u@t.com', authenticationID: 'existing' });
      let callCount = 0;

      // First call for the batch returns users, second call (retry uses same batch)
      // Third call returns empty (end of loop)
      mockEntityManager.createQueryBuilder.mockImplementation(() => {
        callCount++;
        return {
          orderBy: vi.fn().mockReturnThis(),
          skip: vi.fn().mockReturnThis(),
          take: vi.fn().mockReturnThis(),
          getMany: vi.fn().mockResolvedValue(callCount <= 1 ? [user] : []),
        };
      });

      // processBatch: first call throws, second call succeeds
      const originalProcessBatch = (service as any).processBatch.bind(service);
      let processCallCount = 0;
      vi.spyOn(service as any, 'processBatch').mockImplementation(
        async (batch: User[], outcome: any) => {
          processCallCount++;
          if (processCallCount === 1) {
            throw new Error('transient error');
          }
          return originalProcessBatch(batch, outcome);
        }
      );

      const result = await service.backfillAuthenticationIDs();

      expect(result.retriedBatches).toBe(1);
    });
  });
});
