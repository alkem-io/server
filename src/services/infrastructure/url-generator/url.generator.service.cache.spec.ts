import { LogContext } from '@common/enums/logging.context';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock } from 'vitest';
import { UrlGeneratorCacheService } from './url.generator.service.cache';

describe('UrlGeneratorCacheService', () => {
  let service: UrlGeneratorCacheService;
  let cacheManager: { get: Mock; set: Mock; del: Mock };
  let logger: { verbose: Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlGeneratorCacheService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get(UrlGeneratorCacheService);
    cacheManager = module.get(CACHE_MANAGER) as any;
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER) as any;
  });

  describe('getUrlIdCacheKey', () => {
    it('should return a cache key with the entity ID', () => {
      const result = service.getUrlIdCacheKey('entity-123');
      expect(result).toBe('@url:urlGeneratorId:entity-123');
    });
  });

  describe('setUrlCache', () => {
    it('should store the URL in cache with the correct key and options', async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await service.setUrlCache('entity-123', 'https://example.com/path');

      expect(cacheManager.set).toHaveBeenCalledWith(
        '@url:urlGeneratorId:entity-123',
        'https://example.com/path',
        { ttl: 1000 }
      );
    });
  });

  describe('revokeUrlCache', () => {
    it('should delete the cache entry for the given entity ID', async () => {
      cacheManager.del.mockResolvedValue(undefined);

      await service.revokeUrlCache('entity-123');

      expect(cacheManager.del).toHaveBeenCalledWith(
        '@url:urlGeneratorId:entity-123'
      );
    });
  });

  describe('getUrlFromCache', () => {
    it('should return the cached URL when it exists', async () => {
      cacheManager.get.mockResolvedValue('https://example.com/cached');

      const result = await service.getUrlFromCache('entity-123');

      expect(result).toBe('https://example.com/cached');
      expect(cacheManager.get).toHaveBeenCalledWith(
        '@url:urlGeneratorId:entity-123'
      );
    });

    it('should log a verbose message when cache hit', async () => {
      cacheManager.get.mockResolvedValue('https://example.com/cached');

      await service.getUrlFromCache('entity-123');

      expect(logger.verbose).toHaveBeenCalledWith(
        'Using cached url for entity: https://example.com/cached',
        LogContext.URL_GENERATOR
      );
    });

    it('should return undefined when cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getUrlFromCache('entity-123');

      expect(result).toBeUndefined();
    });

    it('should not log when cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      await service.getUrlFromCache('entity-123');

      expect(logger.verbose).not.toHaveBeenCalled();
    });
  });
});
