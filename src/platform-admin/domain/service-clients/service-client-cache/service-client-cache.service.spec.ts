import type Redis from 'ioredis';
import type { Repository } from 'typeorm';
import { type Mock, vi } from 'vitest';

import { ServiceClient } from '../entities/service-client.entity';
import {
  RevokedBearerBlocklistService,
  revokedBearerBlocklistKey,
} from './revoked-bearer-blocklist.service';
import {
  CachedServiceClient,
  SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL,
  SERVICE_CLIENT_CACHE_TTL_SECONDS,
  ServiceClientCacheService,
  ServiceClientCacheUnavailableError,
  serviceClientCacheKey,
} from './service-client-cache.service';

/**
 * 004 T036 — Contract tests for the FR-014 admission cache + T030
 * single-bearer blocklist.
 *
 * Mocks `ioredis` and the TypeORM repository with `vi.fn()`. The
 * pub/sub subscriber is a no-op `Redis` shape; we don't exercise the
 * subscriber callback here (T029 wires it under `onModuleInit`, which
 * the cross-replica integration test exercises in Phase 5).
 */

interface MockRedis {
  get: Mock;
  set: Mock;
  del: Mock;
  publish: Mock;
  exists: Mock;
  subscribe: Mock;
  unsubscribe: Mock;
  on: Mock;
}

interface MockRepo {
  findOne: Mock;
}

function makeRedis(): MockRedis {
  return {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    publish: vi.fn().mockResolvedValue(1),
    exists: vi.fn(),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
}

function makeRepo(): MockRepo {
  return { findOne: vi.fn() };
}

function makeCacheService(
  redis: MockRedis,
  subscriber: MockRedis,
  repo: MockRepo
): ServiceClientCacheService {
  return new ServiceClientCacheService(
    redis as unknown as Redis,
    subscriber as unknown as Redis,
    repo as unknown as Repository<ServiceClient>
  );
}

const SAMPLE_CACHED: CachedServiceClient = {
  status: 'enabled',
  scopes: ['platform:read', 'analytics:read'],
  audience: 'analytics-pipeline',
  accessTokenLifetimeSeconds: 600,
  tokenEndpointAuthMethod: 'client_secret_basic',
};

describe('ServiceClientCacheService (FR-014 admission cache, T036)', () => {
  describe('lookup', () => {
    it('returns the cached JSON shape verbatim on Redis hit', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      redis.get.mockResolvedValueOnce(JSON.stringify(SAMPLE_CACHED));

      const svc = makeCacheService(redis, subscriber, repo);
      const out = await svc.lookup('analytics-pipeline');

      expect(out).toEqual(SAMPLE_CACHED);
      expect(redis.get).toHaveBeenCalledWith(
        serviceClientCacheKey('analytics-pipeline')
      );
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('on Redis miss reads PG, writes back with EX 60s, returns cached shape', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      redis.get.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce({
        clientId: 'analytics-pipeline',
        status: 'enabled',
        audience: 'analytics-pipeline',
        accessTokenLifetimeSeconds: 600,
        tokenEndpointAuthMethod: 'client_secret_basic',
        scopes: [
          { scopeName: 'platform:read' },
          { scopeName: 'analytics:read' },
        ],
      });

      const svc = makeCacheService(redis, subscriber, repo);
      const out = await svc.lookup('analytics-pipeline');

      expect(out).toEqual(SAMPLE_CACHED);
      // Cache shape JSON correct + TTL = 60s (FR-014 contract)
      expect(redis.set).toHaveBeenCalledWith(
        serviceClientCacheKey('analytics-pipeline'),
        JSON.stringify(SAMPLE_CACHED),
        'EX',
        SERVICE_CLIENT_CACHE_TTL_SECONDS
      );
    });

    it('fail-closed: throws ServiceClientCacheUnavailableError when Redis throws AND PG throws', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      redis.get.mockRejectedValueOnce(new Error('redis ECONNREFUSED'));
      repo.findOne.mockRejectedValueOnce(new Error('pg ECONNREFUSED'));

      const svc = makeCacheService(redis, subscriber, repo);
      await expect(svc.lookup('analytics-pipeline')).rejects.toBeInstanceOf(
        ServiceClientCacheUnavailableError
      );
    });

    it('returns null on catalogue miss (PG findOne resolves null)', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      redis.get.mockResolvedValueOnce(null);
      repo.findOne.mockResolvedValueOnce(null);

      const svc = makeCacheService(redis, subscriber, repo);
      const out = await svc.lookup('unknown-client');

      expect(out).toBeNull();
      // Negative result is NOT cache-poisoned to Redis (avoids drift on
      // catalogue add later).
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('serves from local LRU within 5s window without re-hitting Redis', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      redis.get.mockResolvedValueOnce(JSON.stringify(SAMPLE_CACHED));

      const svc = makeCacheService(redis, subscriber, repo);
      await svc.lookup('analytics-pipeline');
      await svc.lookup('analytics-pipeline');
      await svc.lookup('analytics-pipeline');

      // Only the FIRST call hits Redis; subsequent calls served from
      // the in-memory LRU per research R-4 (latency optimisation).
      expect(redis.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidate', () => {
    it('publishes to the pub/sub channel + DELs the Redis key', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      const svc = makeCacheService(redis, subscriber, repo);

      await svc.invalidate('analytics-pipeline');

      expect(redis.del).toHaveBeenCalledWith(
        serviceClientCacheKey('analytics-pipeline')
      );
      expect(redis.publish).toHaveBeenCalledWith(
        SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL,
        'analytics-pipeline'
      );
    });

    it('clears the in-memory LRU so the next lookup re-reads', async () => {
      const redis = makeRedis();
      const subscriber = makeRedis();
      const repo = makeRepo();
      redis.get
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_CACHED))
        .mockResolvedValueOnce(JSON.stringify(SAMPLE_CACHED));

      const svc = makeCacheService(redis, subscriber, repo);
      await svc.lookup('analytics-pipeline'); // hot the LRU
      await svc.invalidate('analytics-pipeline'); // wipe LRU + Redis
      await svc.lookup('analytics-pipeline'); // must re-read Redis

      expect(redis.get).toHaveBeenCalledTimes(2);
    });
  });
});

describe('RevokedBearerBlocklistService (FR-011a tombstones, T036)', () => {
  function makeBlocklist(redis: MockRedis): RevokedBearerBlocklistService {
    return new RevokedBearerBlocklistService(redis as unknown as Redis);
  }

  it('tombstone SETs key with EX = remainingSeconds', async () => {
    const redis = makeRedis();
    const svc = makeBlocklist(redis);
    await svc.tombstone('jti-abc', 600);
    expect(redis.set).toHaveBeenCalledWith(
      revokedBearerBlocklistKey('jti-abc'),
      '1',
      'EX',
      600
    );
  });

  it('tombstone caps TTL at the 900s ATL ceiling', async () => {
    const redis = makeRedis();
    const svc = makeBlocklist(redis);
    await svc.tombstone('jti-abc', 9_999);
    expect(redis.set).toHaveBeenCalledWith(
      revokedBearerBlocklistKey('jti-abc'),
      '1',
      'EX',
      900
    );
  });

  it('tombstone floors TTL to 1s when given a non-positive remaining', async () => {
    const redis = makeRedis();
    const svc = makeBlocklist(redis);
    await svc.tombstone('jti-abc', 0);
    expect(redis.set).toHaveBeenCalledWith(
      revokedBearerBlocklistKey('jti-abc'),
      '1',
      'EX',
      1
    );
  });

  it('isBlocked returns true when EXISTS reports 1', async () => {
    const redis = makeRedis();
    redis.exists.mockResolvedValueOnce(1);
    const svc = makeBlocklist(redis);
    expect(await svc.isBlocked('jti-abc')).toBe(true);
  });

  it('isBlocked returns false when EXISTS reports 0', async () => {
    const redis = makeRedis();
    redis.exists.mockResolvedValueOnce(0);
    const svc = makeBlocklist(redis);
    expect(await svc.isBlocked('jti-abc')).toBe(false);
  });

  it('isBlocked fails closed (returns true) when Redis errors', async () => {
    const redis = makeRedis();
    redis.exists.mockRejectedValueOnce(new Error('redis down'));
    const svc = makeBlocklist(redis);
    expect(await svc.isBlocked('jti-abc')).toBe(true);
  });
});
