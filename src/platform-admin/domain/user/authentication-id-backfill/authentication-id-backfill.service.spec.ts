import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { User } from '@domain/community/user/user.entity';
import { UserService } from '@domain/community/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminAuthenticationIDBackfillService } from './authentication-id-backfill.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('AdminAuthenticationIDBackfillService', () => {
  let service: AdminAuthenticationIDBackfillService;
  let userService: { createOrLinkUserFromAgentInfo: Mock };
  let kratosService: { getIdentityByEmail: Mock };
  let agentInfoCacheService: { deleteAgentInfoFromCache: Mock };
  let db: any;

  const makeUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      email: 'user@test.com',
      authenticationID: '',
      ...overrides,
    }) as User;

  const makeIdentity = (id: string, email: string, verified = true) => ({
    id,
    traits: { email, name: { first: 'F', last: 'L' } },
    verifiable_addresses: [{ via: 'email', verified }],
  });

  // Helper to set up db.query.users.findMany to return the given batches
  const setupBatches = (batches: User[][]) => {
    for (const batch of batches) {
      db.query.users.findMany.mockResolvedValueOnce(batch);
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthenticationIDBackfillService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminAuthenticationIDBackfillService);
    db = module.get(DRIZZLE);
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
      setupBatches([[user], []]);

      const result = await service.backfillAuthenticationIDs();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
      expect(kratosService.getIdentityByEmail).not.toHaveBeenCalled();
    });

    it('should skip users when no Kratos identity is found', async () => {
      const user = makeUser({ authenticationID: '' });
      setupBatches([[user], []]);
      vi.mocked(kratosService.getIdentityByEmail).mockResolvedValue(undefined);

      const result = await service.backfillAuthenticationIDs();

      expect(result.processed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('should update user when identity is found and backfill succeeds', async () => {
      const user = makeUser({
        id: 'user-1',
        email: 'u@t.com',
        authenticationID: '',
      });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupBatches([[user], []]);
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
      expect(
        agentInfoCacheService.deleteAgentInfoFromCache
      ).toHaveBeenCalledWith('kratos-1');
    });

    it('should skip when createOrLinkUserFromAgentInfo returns a different user ID', async () => {
      const user = makeUser({
        id: 'user-1',
        email: 'u@t.com',
        authenticationID: '',
      });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupBatches([[user], []]);
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
      const user = makeUser({
        id: 'user-1',
        email: 'u@t.com',
        authenticationID: '',
      });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupBatches([[user], []]);
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
      const user = makeUser({
        id: 'user-1',
        email: 'u@t.com',
        authenticationID: '',
      });
      const identity = makeIdentity('kratos-1', 'u@t.com');
      setupBatches([[user], []]);
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
      setupBatches([[]]);

      const result = await service.backfillAuthenticationIDs();

      expect(result.processed).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should retry a failed batch once and increment retriedBatches on success', async () => {
      const user = makeUser({
        id: 'user-1',
        email: 'u@t.com',
        authenticationID: 'existing',
      });

      // First call for the batch returns users, second call returns empty (end of loop)
      db.query.users.findMany
        .mockResolvedValueOnce([user])
        .mockResolvedValueOnce([]);

      // processBatch: first call throws, second call succeeds
      const originalProcessBatch = (service as any).processBatch.bind(service);
      let processCallCount = 0;
      vi.spyOn(service as any, 'processBatch').mockImplementation((async (
        batch: User[],
        outcome: any
      ) => {
        processCallCount++;
        if (processCallCount === 1) {
          throw new Error('transient error');
        }
        return originalProcessBatch(batch, outcome);
      }) as any);

      const result = await service.backfillAuthenticationIDs();

      expect(result.retriedBatches).toBe(1);
    });
  });
});
