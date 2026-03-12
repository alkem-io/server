import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Cache } from 'cache-manager';
import { type Mocked, vi } from 'vitest';
import { ActorContext } from './actor.context';
import { ActorContextCacheService } from './actor.context.cache.service';

describe('ActorContextCacheService', () => {
  let service: ActorContextCacheService;
  let cacheManager: Mocked<Cache>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      reset: vi.fn(),
      store: vi.fn(),
      wrap: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActorContextCacheService,
        MockWinstonProvider,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockReturnValue(300),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(ActorContextCacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByActorID', () => {
    it('should return cached actor context', async () => {
      const cached = new ActorContext();
      cached.actorID = 'user-1';
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getByActorID('user-1');

      expect(result).toEqual(cached);
      expect(cacheManager.get).toHaveBeenCalledWith(
        '@actorContext:actorID:user-1'
      );
    });

    it('should return undefined when not cached', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getByActorID('user-2');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteByActorID', () => {
    it('should delete cached entry', async () => {
      await service.deleteByActorID('user-1');

      expect(cacheManager.del).toHaveBeenCalledWith(
        '@actorContext:actorID:user-1'
      );
    });
  });

  describe('setByActorID', () => {
    it('should cache actor context with TTL', async () => {
      const ctx = new ActorContext();
      ctx.actorID = 'user-1';
      cacheManager.set.mockResolvedValue(undefined as never);

      await service.setByActorID(ctx);

      expect(cacheManager.set).toHaveBeenCalledWith(
        '@actorContext:actorID:user-1',
        ctx,
        { ttl: 300 }
      );
    });

    it('should return context without caching when no actorID', async () => {
      const ctx = new ActorContext();

      const result = await service.setByActorID(ctx);

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toBe(ctx);
    });
  });

  describe('updateCredentialsByActorID', () => {
    it('should update credentials when cache entry exists', async () => {
      const cached = new ActorContext();
      cached.actorID = 'user-1';
      cached.credentials = [];
      cacheManager.get.mockResolvedValue(cached);
      cacheManager.set.mockResolvedValue(undefined as never);

      const newCredentials = [
        { type: 'global-registered' as any, resourceID: '' },
      ];
      await service.updateCredentialsByActorID('user-1', newCredentials as any);

      expect(cached.credentials).toEqual(newCredentials);
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should return undefined when no cache entry exists', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.updateCredentialsByActorID(
        'user-1',
        [] as any
      );

      expect(result).toBeUndefined();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });
});
