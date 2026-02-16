import { Agent, IAgent } from '@domain/agent/agent';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Cache } from 'cache-manager';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mocked, vi, describe, it, expect, beforeEach } from 'vitest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentService } from './agent.service';

/* ───────── helpers ───────── */

function makeAgent(id: string, credentials: ICredential[]): IAgent {
  return { id, credentials } as unknown as IAgent;
}

function makeCredential(type: string, resourceID: string): ICredential {
  return { type, resourceID } as unknown as ICredential;
}

/**
 * Custom cache manager mock that exposes mget on the store,
 * unlike the default MockCacheManager which has store as vi.fn().
 */
function createCacheManagerWithMget() {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockImplementation((_key: string, value: any) =>
      Promise.resolve(value)
    ),
    del: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    wrap: vi.fn(),
    store: {
      mget: vi.fn().mockResolvedValue([]),
    },
  };
}

/* ═══════════════════════════════════════════════
   AgentService.getAgentCredentialsBatch
   ═══════════════════════════════════════════════ */

describe('AgentService.getAgentCredentialsBatch', () => {
  let service: AgentService;
  let cacheManager: ReturnType<typeof createCacheManagerWithMget>;
  let agentRepository: Mocked<Repository<Agent>>;

  beforeEach(async () => {
    cacheManager = createCacheManagerWithMget();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue(300) },
        },
        repositoryProviderMockFactory(Agent),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AgentService);
    agentRepository = module.get(
      getRepositoryToken(Agent)
    ) as Mocked<Repository<Agent>>;
  });

  it('should return empty map for empty input', async () => {
    const result = await service.getAgentCredentialsBatch([]);

    expect(result.size).toBe(0);
    expect(cacheManager.store.mget).not.toHaveBeenCalled();
    expect(agentRepository.find).not.toHaveBeenCalled();
  });

  it('should return from cache when all agents are cached', async () => {
    const cred1 = makeCredential('space-member', 'space-1');
    const cred2 = makeCredential('org-member', 'org-1');
    const agent1 = makeAgent('agent-1', [cred1]);
    const agent2 = makeAgent('agent-2', [cred2]);

    cacheManager.store.mget.mockResolvedValue([agent1, agent2]);

    const result = await service.getAgentCredentialsBatch([
      'agent-1',
      'agent-2',
    ]);

    expect(result.size).toBe(2);
    expect(result.get('agent-1')).toEqual([cred1]);
    expect(result.get('agent-2')).toEqual([cred2]);
    // No DB query needed
    expect(agentRepository.find).not.toHaveBeenCalled();
  });

  it('should query DB for cache misses only', async () => {
    const cred1 = makeCredential('space-member', 'space-1');
    const cred2 = makeCredential('org-member', 'org-1');
    const agent1 = makeAgent('agent-1', [cred1]);
    const agent2 = makeAgent('agent-2', [cred2]);

    // agent-1 is cached, agent-2 is not
    cacheManager.store.mget.mockResolvedValue([agent1, undefined]);
    agentRepository.find.mockResolvedValue([agent2 as unknown as Agent]);

    const result = await service.getAgentCredentialsBatch([
      'agent-1',
      'agent-2',
    ]);

    expect(result.size).toBe(2);
    expect(result.get('agent-1')).toEqual([cred1]);
    expect(result.get('agent-2')).toEqual([cred2]);
    // DB queried only for agent-2
    expect(agentRepository.find).toHaveBeenCalledTimes(1);
    expect(agentRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expect.anything() },
        relations: { credentials: true },
      })
    );
  });

  it('should warm cache for agents loaded from DB', async () => {
    const cred = makeCredential('space-member', 'space-1');
    const agent = makeAgent('agent-1', [cred]);

    cacheManager.store.mget.mockResolvedValue([undefined]);
    agentRepository.find.mockResolvedValue([agent as unknown as Agent]);

    await service.getAgentCredentialsBatch(['agent-1']);

    // Should set agent in cache
    expect(cacheManager.set).toHaveBeenCalledWith(
      '@agent:id:agent-1',
      agent,
      expect.objectContaining({ ttl: expect.any(Number) })
    );
  });

  it('should return empty credentials array for agents not found in DB', async () => {
    cacheManager.store.mget.mockResolvedValue([undefined]);
    agentRepository.find.mockResolvedValue([]); // Agent not in DB

    const result = await service.getAgentCredentialsBatch(['agent-missing']);

    expect(result.size).toBe(1);
    expect(result.get('agent-missing')).toEqual([]);
  });

  it('should handle agent cached without credentials (treated as miss)', async () => {
    // Agent in cache but without credentials property
    const agentNoCreds = { id: 'agent-1' } as unknown as IAgent;
    cacheManager.store.mget.mockResolvedValue([agentNoCreds]);

    const cred = makeCredential('space-member', 'space-1');
    const fullAgent = makeAgent('agent-1', [cred]);
    agentRepository.find.mockResolvedValue([fullAgent as unknown as Agent]);

    const result = await service.getAgentCredentialsBatch(['agent-1']);

    expect(result.get('agent-1')).toEqual([cred]);
    // Should fall back to DB since cached agent had no credentials
    expect(agentRepository.find).toHaveBeenCalledTimes(1);
  });

  it('should fall back to sequential gets when mget is not available', async () => {
    // Remove mget from store to simulate stores that don't support it
    (cacheManager as any).store = {};

    const cred = makeCredential('space-member', 'space-1');
    const agent = makeAgent('agent-1', [cred]);

    cacheManager.get.mockResolvedValue(agent as any);

    const result = await service.getAgentCredentialsBatch(['agent-1']);

    expect(result.get('agent-1')).toEqual([cred]);
    expect(cacheManager.get).toHaveBeenCalledWith('@agent:id:agent-1');
    expect(agentRepository.find).not.toHaveBeenCalled();
  });

  it('should handle multiple cache misses in a single DB batch', async () => {
    const cred1 = makeCredential('space-member', 'space-1');
    const cred2 = makeCredential('org-member', 'org-1');
    const cred3 = makeCredential('space-lead', 'space-1');
    const agent1 = makeAgent('agent-1', [cred1]);
    const agent2 = makeAgent('agent-2', [cred2]);
    const agent3 = makeAgent('agent-3', [cred3]);

    cacheManager.store.mget.mockResolvedValue([
      undefined,
      undefined,
      undefined,
    ]);
    agentRepository.find.mockResolvedValue([
      agent1,
      agent2,
      agent3,
    ] as unknown as Agent[]);

    const result = await service.getAgentCredentialsBatch([
      'agent-1',
      'agent-2',
      'agent-3',
    ]);

    expect(result.size).toBe(3);
    expect(result.get('agent-1')).toEqual([cred1]);
    expect(result.get('agent-2')).toEqual([cred2]);
    expect(result.get('agent-3')).toEqual([cred3]);
    // Single DB call for all misses
    expect(agentRepository.find).toHaveBeenCalledTimes(1);
  });
});
