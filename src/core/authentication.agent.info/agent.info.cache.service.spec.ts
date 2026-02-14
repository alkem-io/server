import { LogContext } from '@common/enums/logging.context';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent.info.cache.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock, vi } from 'vitest';
import { IAgent } from '@domain/agent/agent/agent.interface';

describe('AgentInfoCacheService', () => {
  let service: AgentInfoCacheService;
  let cacheManager: Record<string, Mock>;
  let logger: Record<string, Mock>;
  let entityManager: Record<string, Mock>;

  const CACHE_TTL = 600;

  beforeEach(async () => {
    const mockEntityManager = {
      connection: {
        query: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentInfoCacheService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(CACHE_TTL),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AgentInfoCacheService);
    cacheManager = module.get(CACHE_MANAGER);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as unknown as Record<
      string,
      Mock
    >;
    entityManager = module.get(getEntityManagerToken('default'));
  });

  // ── getAgentInfoFromCache ─────────────────────────────────────────

  describe('getAgentInfoFromCache', () => {
    it('should return cached AgentInfo when present', async () => {
      const authId = 'kratos-id-123';
      const cachedInfo = new AgentInfo();
      cachedInfo.authenticationID = authId;
      cachedInfo.userID = 'user-1';
      cachedInfo.email = 'test@example.com';

      cacheManager.get.mockResolvedValue(cachedInfo);

      const result = await service.getAgentInfoFromCache(authId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        `@agentInfo:authId:${authId}`
      );
      expect(result).toEqual(cachedInfo);
    });

    it('should return undefined when no cached entry exists', async () => {
      const authId = 'nonexistent-kratos-id';

      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getAgentInfoFromCache(authId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        `@agentInfo:authId:${authId}`
      );
      expect(result).toBeUndefined();
    });

    it('should use consistent cache key format for the same authenticationID', async () => {
      const authId = 'stable-auth-id';

      cacheManager.get.mockResolvedValue(undefined);

      await service.getAgentInfoFromCache(authId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        '@agentInfo:authId:stable-auth-id'
      );
    });
  });

  // ── deleteAgentInfoFromCache ──────────────────────────────────────

  describe('deleteAgentInfoFromCache', () => {
    it('should delete the cached entry for the given authenticationID', async () => {
      const authId = 'kratos-id-456';

      cacheManager.del.mockResolvedValue(undefined);

      await service.deleteAgentInfoFromCache(authId);

      expect(cacheManager.del).toHaveBeenCalledWith(
        `@agentInfo:authId:${authId}`
      );
    });

    it('should return the result of cache deletion', async () => {
      const authId = 'kratos-id-789';

      cacheManager.del.mockResolvedValue(true);

      const result = await service.deleteAgentInfoFromCache(authId);

      expect(result).toBe(true);
    });
  });

  // ── setAgentInfoCache ─────────────────────────────────────────────

  describe('setAgentInfoCache', () => {
    it('should cache AgentInfo with the configured TTL when authenticationID is present', async () => {
      const agentInfo = new AgentInfo();
      agentInfo.authenticationID = 'kratos-id-abc';
      agentInfo.userID = 'user-1';
      agentInfo.email = 'user@example.com';

      cacheManager.set.mockResolvedValue(agentInfo);

      const result = await service.setAgentInfoCache(agentInfo);

      expect(cacheManager.set).toHaveBeenCalledWith(
        '@agentInfo:authId:kratos-id-abc',
        agentInfo,
        { ttl: CACHE_TTL }
      );
      expect(result).toEqual(agentInfo);
    });

    it('should skip caching and return agentInfo unchanged when authenticationID is empty', async () => {
      const agentInfo = new AgentInfo();
      agentInfo.authenticationID = '';
      agentInfo.userID = 'user-guest';

      const result = await service.setAgentInfoCache(agentInfo);

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(agentInfo);
    });

    it('should skip caching when authenticationID is falsy (undefined-like default)', async () => {
      const agentInfo = new AgentInfo();
      // Default AgentInfo has authenticationID = '' which is falsy

      const result = await service.setAgentInfoCache(agentInfo);

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(agentInfo);
    });

    it('should cache guests or anonymous users that somehow have an authenticationID', async () => {
      const agentInfo = new AgentInfo();
      agentInfo.isAnonymous = true;
      agentInfo.authenticationID = 'kratos-anon-id';

      cacheManager.set.mockResolvedValue(agentInfo);

      await service.setAgentInfoCache(agentInfo);

      expect(cacheManager.set).toHaveBeenCalledWith(
        '@agentInfo:authId:kratos-anon-id',
        agentInfo,
        { ttl: CACHE_TTL }
      );
    });
  });

  // ── updateAgentInfoCache ──────────────────────────────────────────

  describe('updateAgentInfoCache', () => {
    it('should update cached credentials when agent has a valid authenticationID and cache entry', async () => {
      const agentId = 'agent-uuid-1';
      const authId = 'kratos-id-xyz';
      const newCredentials = [
        { id: 'cred-1', type: 'global-admin', resourceID: '' },
        { id: 'cred-2', type: 'global-registered', resourceID: '' },
      ];

      const agent = {
        id: agentId,
        credentials: newCredentials,
      } as unknown as IAgent;

      const cachedAgentInfo = new AgentInfo();
      cachedAgentInfo.authenticationID = authId;
      cachedAgentInfo.userID = 'user-1';
      cachedAgentInfo.credentials = [];

      // Mock: getAuthenticationIdForAgent returns authId
      entityManager.connection.query.mockResolvedValue([
        { authenticationID: authId },
      ]);

      // Mock: getAgentInfoFromCache returns cached entry
      cacheManager.get.mockResolvedValue(cachedAgentInfo);

      // Mock: setAgentInfoCache stores updated entry
      cacheManager.set.mockResolvedValue(cachedAgentInfo);

      const result = await service.updateAgentInfoCache(agent);

      // Verify the credentials were updated on the cached object
      expect(cachedAgentInfo.credentials).toEqual(newCredentials);
      // Verify it attempted to re-cache the updated entry
      expect(cacheManager.set).toHaveBeenCalledWith(
        `@agentInfo:authId:${authId}`,
        cachedAgentInfo,
        { ttl: CACHE_TTL }
      );
    });

    it('should return undefined when no authenticationID is found for the agent', async () => {
      const agentId = 'agent-uuid-orphan';
      const agent = {
        id: agentId,
        credentials: [],
      } as unknown as IAgent;

      // No user found for this agent
      entityManager.connection.query.mockResolvedValue([]);

      const result = await service.updateAgentInfoCache(agent);

      expect(result).toBeUndefined();
      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should return undefined when query returns user with null authenticationID', async () => {
      const agentId = 'agent-uuid-null-auth';
      const agent = {
        id: agentId,
        credentials: [],
      } as unknown as IAgent;

      entityManager.connection.query.mockResolvedValue([
        { authenticationID: null },
      ]);

      const result = await service.updateAgentInfoCache(agent);

      expect(result).toBeUndefined();
      expect(cacheManager.get).not.toHaveBeenCalled();
    });

    it('should return undefined when authenticationID is found but no cache entry exists', async () => {
      const agentId = 'agent-uuid-no-cache';
      const authId = 'kratos-id-no-cache';
      const agent = {
        id: agentId,
        credentials: [{ id: 'cred-1', type: 'admin', resourceID: '' }],
      } as unknown as IAgent;

      entityManager.connection.query.mockResolvedValue([
        { authenticationID: authId },
      ]);

      // No cached entry
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.updateAgentInfoCache(agent);

      expect(result).toBeUndefined();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should log verbose message when no authenticationID is found for agent', async () => {
      const agentId = 'agent-uuid-log-test';
      const agent = {
        id: agentId,
        credentials: [],
      } as unknown as IAgent;

      entityManager.connection.query.mockResolvedValue([]);

      await service.updateAgentInfoCache(agent);

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining(agentId),
        LogContext.AGENT
      );
    });

    it('should log verbose message when no cache entry is found for authenticationID', async () => {
      const agentId = 'agent-uuid-cache-miss';
      const authId = 'kratos-id-miss';
      const agent = {
        id: agentId,
        credentials: [],
      } as unknown as IAgent;

      entityManager.connection.query.mockResolvedValue([
        { authenticationID: authId },
      ]);
      cacheManager.get.mockResolvedValue(undefined);

      await service.updateAgentInfoCache(agent);

      expect(logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('No cache entry'),
        LogContext.AGENT
      );
    });

    it('should pass agent ID to the SQL query for looking up authenticationID', async () => {
      const agentId = 'agent-uuid-sql';
      const agent = {
        id: agentId,
        credentials: [],
      } as unknown as IAgent;

      entityManager.connection.query.mockResolvedValue([]);

      await service.updateAgentInfoCache(agent);

      expect(entityManager.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        [agentId]
      );
    });

    it('should replace credentials entirely, not merge them', async () => {
      const agentId = 'agent-uuid-replace';
      const authId = 'kratos-id-replace';
      const oldCredentials = [
        { id: 'old-cred', type: 'global-registered', resourceID: '' },
      ];
      const newCredentials = [
        { id: 'new-cred', type: 'global-admin', resourceID: 'space-1' },
      ];

      const agent = {
        id: agentId,
        credentials: newCredentials,
      } as unknown as IAgent;

      const cachedAgentInfo = new AgentInfo();
      cachedAgentInfo.authenticationID = authId;
      cachedAgentInfo.credentials = oldCredentials as any;

      entityManager.connection.query.mockResolvedValue([
        { authenticationID: authId },
      ]);
      cacheManager.get.mockResolvedValue(cachedAgentInfo);
      cacheManager.set.mockResolvedValue(cachedAgentInfo);

      await service.updateAgentInfoCache(agent);

      // Credentials should be fully replaced, not merged
      expect(cachedAgentInfo.credentials).toEqual(newCredentials);
      expect(cachedAgentInfo.credentials).not.toContainEqual(
        expect.objectContaining({ id: 'old-cred' })
      );
    });
  });
});
