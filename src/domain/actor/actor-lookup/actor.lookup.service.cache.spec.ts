import { ActorType } from '@common/enums/actor.type';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { vi } from 'vitest';
import { ActorTypeCacheService } from './actor.lookup.service.cache';

describe('ActorTypeCacheService', () => {
  let service: ActorTypeCacheService;
  let cacheManager: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActorTypeCacheService,
        MockCacheManager,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue(3600),
          },
        },
      ],
    }).compile();

    service = module.get(ActorTypeCacheService);
    cacheManager = module.get('CACHE_MANAGER');
  });

  describe('getActorType', () => {
    it('should return cached actor type', async () => {
      cacheManager.get.mockResolvedValue(ActorType.USER);

      const result = await service.getActorType('actor-1');
      expect(result).toBe(ActorType.USER);
      expect(cacheManager.get).toHaveBeenCalledWith('@actorType:actor-1');
    });

    it('should return undefined when not cached', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getActorType('actor-1');
      expect(result).toBeUndefined();
    });
  });

  describe('setActorType', () => {
    it('should cache actor type with TTL', async () => {
      cacheManager.set.mockResolvedValue(ActorType.USER);

      const result = await service.setActorType('actor-1', ActorType.USER);
      expect(result).toBe(ActorType.USER);
      expect(cacheManager.set).toHaveBeenCalledWith(
        '@actorType:actor-1',
        ActorType.USER,
        { ttl: 3600 }
      );
    });
  });

  describe('setActorTypes', () => {
    it('should cache multiple actor types', async () => {
      cacheManager.set.mockResolvedValue(undefined);

      const typeMap = new Map<string, ActorType>([
        ['actor-1', ActorType.USER],
        ['actor-2', ActorType.ORGANIZATION],
      ]);

      await service.setActorTypes(typeMap);

      expect(cacheManager.set).toHaveBeenCalledTimes(2);
      expect(cacheManager.set).toHaveBeenCalledWith(
        '@actorType:actor-1',
        ActorType.USER,
        { ttl: 3600 }
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        '@actorType:actor-2',
        ActorType.ORGANIZATION,
        { ttl: 3600 }
      );
    });

    it('should handle empty map', async () => {
      await service.setActorTypes(new Map());
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getActorTypes', () => {
    it('should return map of found actor types', async () => {
      cacheManager.get
        .mockResolvedValueOnce(ActorType.USER)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(ActorType.SPACE);

      const result = await service.getActorTypes([
        'actor-1',
        'actor-2',
        'actor-3',
      ]);

      expect(result.size).toBe(2);
      expect(result.get('actor-1')).toBe(ActorType.USER);
      expect(result.get('actor-3')).toBe(ActorType.SPACE);
      expect(result.has('actor-2')).toBe(false);
    });

    it('should return empty map for empty input', async () => {
      const result = await service.getActorTypes([]);
      expect(result.size).toBe(0);
    });
  });

  describe('deleteActorType', () => {
    it('should delete cached actor type', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await service.deleteActorType('actor-1');
      expect(cacheManager.del).toHaveBeenCalledWith('@actorType:actor-1');
    });
  });
});
