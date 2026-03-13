import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Cache } from 'cache-manager';
import { type Mocked, vi } from 'vitest';
import { ActorContext } from './actor.context';
import { ActorContextCacheService } from './actor.context.cache.service';

describe('ActorContextCacheService', () => {
  let service: ActorContextCacheService;
  let cacheManager: Mocked<Cache>;

  const mockActorContext: ActorContext = {
    actorID: 'user-123',
    credentials: [{ type: 'GlobalRegistered' as any, resourceID: '' }],
    isAnonymous: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActorContextCacheService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'identity.authentication.cache_ttl') {
                return 300;
              }
              return {};
            }),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(ActorContextCacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByActorID', () => {
    it('should retrieve cached ActorContext by actorID', async () => {
      (cacheManager.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockActorContext
      );

      const result = await service.getByActorID('user-123');

      expect(cacheManager.get).toHaveBeenCalledWith(
        '@actorContext:actorID:user-123'
      );
      expect(result).toEqual(mockActorContext);
    });

    it('should return undefined when no cached entry exists', async () => {
      (cacheManager.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const result = await service.getByActorID('non-existent');

      expect(cacheManager.get).toHaveBeenCalledWith(
        '@actorContext:actorID:non-existent'
      );
      expect(result).toBeUndefined();
    });
  });

  describe('deleteByActorID', () => {
    it('should delete cached entry by actorID', async () => {
      await service.deleteByActorID('user-123');

      expect(cacheManager.del).toHaveBeenCalledWith(
        '@actorContext:actorID:user-123'
      );
    });
  });

  describe('setByActorID', () => {
    it('should cache ActorContext with TTL', async () => {
      (cacheManager.set as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockActorContext
      );

      const result = await service.setByActorID(mockActorContext);

      expect(cacheManager.set).toHaveBeenCalledWith(
        '@actorContext:actorID:user-123',
        mockActorContext,
        { ttl: 300 }
      );
      expect(result).toEqual(mockActorContext);
    });

    it('should return context without caching when actorID is empty', async () => {
      const anonymousContext: ActorContext = {
        actorID: '',
        credentials: [],
        isAnonymous: true,
      };

      const result = await service.setByActorID(anonymousContext);

      expect(cacheManager.set).not.toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });
  });

  describe('updateCredentialsByActorID', () => {
    it('should update credentials when cached entry exists', async () => {
      const cachedContext = { ...mockActorContext };
      const newCredentials = [
        { type: 'GlobalAdmin' as any, resourceID: '' },
      ] as any;

      (cacheManager.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        cachedContext
      );
      (cacheManager.set as ReturnType<typeof vi.fn>).mockImplementation(
        (_key: string, ctx: ActorContext) => Promise.resolve(ctx)
      );

      const result = await service.updateCredentialsByActorID(
        'user-123',
        newCredentials
      );

      expect(cacheManager.get).toHaveBeenCalledWith(
        '@actorContext:actorID:user-123'
      );
      expect(result).toBeDefined();
      expect(result?.credentials).toEqual(newCredentials);
    });

    it('should return undefined when no cached entry exists', async () => {
      (cacheManager.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const result = await service.updateCredentialsByActorID(
        'non-existent',
        []
      );

      expect(result).toBeUndefined();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });
});
