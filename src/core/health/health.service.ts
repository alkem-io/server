import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type Redis from 'ioredis';
import { HEALTH_JWKS_HANDLE, HEALTH_REDIS_HANDLE } from './health.tokens';
import {
  JWKS_FRESHNESS_MAX_AGE_S,
  type JwksFreshnessHandle,
  jwksAgeSeconds,
} from './jwks-freshness';

// FR-036a — uniform ≤500 ms timeout per dep-check, ≤2 s TTL cache on the
// dep-check result so probe storms don't hammer the dependency.
export const DEP_CHECK_TIMEOUT_MS = 500;
export const DEP_CHECK_CACHE_TTL_MS = 2_000;

export type CheckStatus = 'ok' | 'unhealthy';

export type ReadinessResult = {
  status: CheckStatus;
  checks: {
    redis: { status: CheckStatus; error?: string };
    jwks: { status: CheckStatus; ageSeconds: number | null; error?: string };
  };
};

type CacheEntry<T> = {
  value: T;
  storedAtMs: number;
};

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    @Optional() @Inject(HEALTH_REDIS_HANDLE) private readonly redis?: Redis,
    @Optional()
    @Inject(HEALTH_JWKS_HANDLE)
    private readonly jwks?: JwksFreshnessHandle
  ) {}

  // Liveness — handler responsive only. No dependency calls.
  async live(): Promise<{ status: 'ok' }> {
    return { status: 'ok' };
  }

  // Readiness — Redis PING + JWKS freshness. Both gated by ≤500 ms timeout
  // and ≤2 s TTL cache to avoid probe-induced load on the deps.
  async ready(): Promise<ReadinessResult> {
    const redis = await this.cachedCheck('redis', () => this.checkRedis());
    const jwks = await this.cachedCheck('jwks', () =>
      Promise.resolve(this.checkJwks())
    );

    const status: CheckStatus =
      redis.status === 'ok' && jwks.status === 'ok' ? 'ok' : 'unhealthy';

    return {
      status,
      checks: { redis, jwks },
    };
  }

  private async checkRedis(): Promise<ReadinessResult['checks']['redis']> {
    if (!this.redis) {
      return { status: 'unhealthy', error: 'redis_not_configured' };
    }
    try {
      const result = await this.withTimeout(
        this.redis.ping(),
        DEP_CHECK_TIMEOUT_MS,
        'redis_ping_timeout'
      );
      if (result !== 'PONG') {
        return { status: 'unhealthy', error: 'redis_unexpected_reply' };
      }
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'unhealthy',
        error: errorCode(err),
      };
    }
  }

  private checkJwks(): ReadinessResult['checks']['jwks'] {
    if (!this.jwks) {
      return {
        status: 'unhealthy',
        ageSeconds: null,
        error: 'jwks_not_configured',
      };
    }
    const age = jwksAgeSeconds(this.jwks);
    if (age === null) {
      // Fresh process: no Bearer JWT has been verified yet, so we have no
      // freshness signal. Treat as healthy so a freshly-rolled pod can come
      // up — first Bearer call will populate the timestamp. The Redis check
      // already gates on a real dep being reachable, so this isn't a free
      // pass.
      return { status: 'ok', ageSeconds: null };
    }
    if (age > JWKS_FRESHNESS_MAX_AGE_S) {
      return {
        status: 'unhealthy',
        ageSeconds: age,
        error: 'jwks_cache_stale',
      };
    }
    return { status: 'ok', ageSeconds: age };
  }

  private async cachedCheck<T>(
    key: string,
    compute: () => Promise<T>
  ): Promise<T> {
    const nowMs = Date.now();
    const existing = this.cache.get(key);
    if (existing && nowMs - existing.storedAtMs < DEP_CHECK_CACHE_TTL_MS) {
      return existing.value as T;
    }
    const value = await compute();
    this.cache.set(key, { value, storedAtMs: nowMs });
    return value;
  }

  private async withTimeout<T>(
    p: Promise<T>,
    timeoutMs: number,
    timeoutCode: string
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutCode)), timeoutMs);
    });
    try {
      return await Promise.race([p, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function errorCode(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'unknown_error';
}
