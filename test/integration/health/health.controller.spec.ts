import { HealthController } from '@core/health/health.controller';
import {
  DEP_CHECK_CACHE_TTL_MS,
  HealthService,
} from '@core/health/health.service';
import {
  HEALTH_JWKS_HANDLE,
  HEALTH_REDIS_HANDLE,
} from '@core/health/health.tokens';
import {
  JWKS_FRESHNESS_MAX_AGE_S,
  type JwksFreshnessHandle,
} from '@core/health/jwks-freshness';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// FR-036a contract — alkemio-server health probes
//   /health/live  -> 200, {status:"ok"} regardless of dep state
//   /health/ready -> 200 when Redis PING + JWKS freshness both ok;
//                    503 when either fails;
//                    cached for ≤2 s

type RedisStub = {
  ping: ReturnType<typeof vi.fn>;
};

function buildRedisStub(): RedisStub {
  return {
    ping: vi.fn(async () => 'PONG'),
  };
}

function buildJwksStub(opts: {
  lastRefreshAt: number | null;
}): JwksFreshnessHandle {
  return {
    getKey: vi.fn() as unknown as JwksFreshnessHandle['getKey'],
    lastRefreshAt: () => opts.lastRefreshAt,
  };
}

async function createHarness(opts: {
  redis?: RedisStub | null;
  jwks?: JwksFreshnessHandle | null;
}): Promise<{ app: INestApplication; redis: RedisStub | null }> {
  const redis = opts.redis === undefined ? buildRedisStub() : opts.redis;
  const jwks =
    opts.jwks === undefined
      ? buildJwksStub({ lastRefreshAt: Math.floor(Date.now() / 1000) })
      : opts.jwks;

  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      HealthService,
      {
        provide: HEALTH_REDIS_HANDLE,
        useValue: redis,
      },
      {
        provide: HEALTH_JWKS_HANDLE,
        useValue: jwks,
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(express.json());
  await app.init();
  return { app, redis };
}

describe('HealthController (FR-036a, T063)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health/live', () => {
    it('returns 200 + {status:"ok"} regardless of dep state', async () => {
      const harness = await createHarness({
        redis: { ping: vi.fn(async () => Promise.reject(new Error('down'))) },
        jwks: buildJwksStub({ lastRefreshAt: null }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('does not call Redis or JWKS deps', async () => {
      const redis = buildRedisStub();
      const jwks = buildJwksStub({ lastRefreshAt: 0 });
      const lastRefreshSpy = vi.spyOn(jwks, 'lastRefreshAt');
      const harness = await createHarness({ redis, jwks });
      app = harness.app;

      await request(app.getHttpServer()).get('/health/live');

      expect(redis.ping).not.toHaveBeenCalled();
      expect(lastRefreshSpy).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 when Redis PING and JWKS are healthy', async () => {
      const harness = await createHarness({
        redis: buildRedisStub(),
        jwks: buildJwksStub({ lastRefreshAt: Math.floor(Date.now() / 1000) }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.checks.redis.status).toBe('ok');
      expect(res.body.checks.jwks.status).toBe('ok');
    });

    it('returns 200 when JWKS has not yet been resolved (fresh process)', async () => {
      // No Bearer JWT verified yet → lastRefreshAt is null. Per spec, this
      // does not block readiness on a freshly-rolled pod.
      const harness = await createHarness({
        redis: buildRedisStub(),
        jwks: buildJwksStub({ lastRefreshAt: null }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.checks.jwks.status).toBe('ok');
      expect(res.body.checks.jwks.ageSeconds).toBeNull();
    });

    it('returns 503 when Redis PING fails', async () => {
      const failingRedis: RedisStub = {
        ping: vi.fn(async () => {
          throw new Error('ECONNREFUSED');
        }),
      };
      const harness = await createHarness({
        redis: failingRedis,
        jwks: buildJwksStub({ lastRefreshAt: Math.floor(Date.now() / 1000) }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body.checks.redis.status).toBe('unhealthy');
      expect(res.body.checks.redis.error).toBe('ECONNREFUSED');
      // JWKS still healthy — checks are independent.
      expect(res.body.checks.jwks.status).toBe('ok');
    });

    it('returns 503 when Redis PING returns unexpected reply', async () => {
      const oddRedis: RedisStub = {
        ping: vi.fn(async () => 'NOT_PONG'),
      };
      const harness = await createHarness({
        redis: oddRedis,
        jwks: buildJwksStub({ lastRefreshAt: Math.floor(Date.now() / 1000) }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.checks.redis.status).toBe('unhealthy');
      expect(res.body.checks.redis.error).toBe('redis_unexpected_reply');
    });

    it('returns 503 when JWKS cache is older than 48 h (FR-036a)', async () => {
      const tooOld =
        Math.floor(Date.now() / 1000) - JWKS_FRESHNESS_MAX_AGE_S - 60;
      const harness = await createHarness({
        redis: buildRedisStub(),
        jwks: buildJwksStub({ lastRefreshAt: tooOld }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.checks.jwks.status).toBe('unhealthy');
      expect(res.body.checks.jwks.error).toBe('jwks_cache_stale');
      expect(res.body.checks.jwks.ageSeconds).toBeGreaterThan(
        JWKS_FRESHNESS_MAX_AGE_S
      );
    });

    it('caches dep-check results for ≤2 s window', async () => {
      const redis = buildRedisStub();
      const harness = await createHarness({
        redis,
        jwks: buildJwksStub({ lastRefreshAt: Math.floor(Date.now() / 1000) }),
      });
      app = harness.app;

      // Two back-to-back calls within the cache window — Redis PING should
      // only fire once.
      await request(app.getHttpServer()).get('/health/ready');
      await request(app.getHttpServer()).get('/health/ready');
      await request(app.getHttpServer()).get('/health/ready');

      expect(redis.ping).toHaveBeenCalledTimes(1);
      // Sanity-check the cache window is the documented value.
      expect(DEP_CHECK_CACHE_TTL_MS).toBe(2_000);
    });

    it('re-runs the Redis check after the cache window expires', async () => {
      vi.useFakeTimers();
      try {
        const redis = buildRedisStub();
        const harness = await createHarness({
          redis,
          jwks: buildJwksStub({
            lastRefreshAt: Math.floor(Date.now() / 1000),
          }),
        });
        app = harness.app;

        await request(app.getHttpServer()).get('/health/ready');
        // Advance past the 2 s window — the next probe MUST re-check.
        vi.advanceTimersByTime(DEP_CHECK_CACHE_TTL_MS + 100);
        await request(app.getHttpServer()).get('/health/ready');

        expect(redis.ping).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns 503 with timeout error when Redis PING hangs past 500 ms', async () => {
      const hangingRedis: RedisStub = {
        ping: vi.fn(
          () =>
            new Promise(() => {
              /* never resolves */
            })
        ),
      };
      const harness = await createHarness({
        redis: hangingRedis,
        jwks: buildJwksStub({ lastRefreshAt: Math.floor(Date.now() / 1000) }),
      });
      app = harness.app;

      const res = await request(app.getHttpServer()).get('/health/ready');
      expect(res.status).toBe(503);
      expect(res.body.checks.redis.status).toBe('unhealthy');
      expect(res.body.checks.redis.error).toBe('redis_ping_timeout');
    }, 5_000);
  });
});
