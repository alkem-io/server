import { LogContext } from '@common/enums/logging.context';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { type Mock, vi } from 'vitest';
import { UrlGeneratorCacheService } from './url.generator.service.cache';

describe('UrlGeneratorCacheService', () => {
  let service: UrlGeneratorCacheService;
  let cacheManager: { get: Mock; set: Mock; del: Mock };
  let logger: { verbose: Mock; error: Mock };
  let entityManager: { connection: { query: Mock } };

  beforeEach(async () => {
    entityManager = {
      connection: {
        query: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlGeneratorCacheService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
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

  describe('revokeUrlCachesForContentInSpaces', () => {
    it('is a no-op when no spaces are provided', async () => {
      await service.revokeUrlCachesForContentInSpaces([]);

      expect(entityManager.connection.query).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('runs a single SQL pass and revokes every distinct profile id', async () => {
      entityManager.connection.query.mockResolvedValue([
        { profileId: 'p-framing-1' },
        { profileId: 'p-framing-2' },
        { profileId: 'p-framing-1' }, // duplicate — must be deduped
        { profileId: 'p-post-1' },
        { profileId: null }, // null contribution profile — must be skipped
        { profileId: 'p-memo-1' },
      ]);
      cacheManager.del.mockResolvedValue(undefined);

      await service.revokeUrlCachesForContentInSpaces(['space-a', 'space-b']);

      expect(entityManager.connection.query).toHaveBeenCalledTimes(1);
      const [, params] = entityManager.connection.query.mock.calls[0];
      expect(params).toEqual([['space-a', 'space-b']]);

      const deletedKeys = cacheManager.del.mock.calls.map(c => c[0]);
      expect(deletedKeys).toContain('@url:urlGeneratorId:p-framing-1');
      expect(deletedKeys).toContain('@url:urlGeneratorId:p-framing-2');
      expect(deletedKeys).toContain('@url:urlGeneratorId:p-post-1');
      expect(deletedKeys).toContain('@url:urlGeneratorId:p-memo-1');
      expect(deletedKeys).toHaveLength(4); // dedup + null skipped
    });

    it('sweeps framing memos, collabora documents and calendar events too', async () => {
      entityManager.connection.query.mockResolvedValue([]);

      await service.revokeUrlCachesForContentInSpaces(['space-a']);

      const [sql] = entityManager.connection.query.mock.calls[0];
      // These four joins are the ones that were missing while their profiles
      // still resolved to a space-derived URL.
      expect(sql).toContain('"memo" fm          ON fm."id" = cf."memoId"');
      expect(sql).toContain(
        '"collabora_document" fcd ON fcd."id" = cf."collaboraDocumentId"'
      );
      expect(sql).toContain(
        '"collabora_document" cd ON cd."id" = cc."collaboraDocumentId"'
      );
      expect(sql).toContain(
        '"calendar_event" ce ON ce."calendarId" = t."calendarId"'
      );
    });

    it('logs and continues when a single revoke fails', async () => {
      entityManager.connection.query.mockResolvedValue([
        { profileId: 'p-1' },
        { profileId: 'p-2' },
      ]);
      cacheManager.del
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined);

      await service.revokeUrlCachesForContentInSpaces(['space-a']);

      expect(cacheManager.del).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
