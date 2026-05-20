import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import { ServiceClient } from '../entities/service-client.entity';

/**
 * 004 T029 — `ServiceClientCacheService` (research.md R-4, data-model.md §6).
 *
 * Lazy-loaded Redis-backed cache for the FR-014 admission gate. The cache
 * has three tiers, from hottest to coldest:
 *   1. In-memory LRU (5 s TTL, latency optimisation only — NOT the contract)
 *   2. Redis (60 s TTL — the contractual floor per FR-014)
 *   3. Postgres `service_client` + `service_client_scope` join (cold path)
 *
 * Fail-closed posture: if Redis AND Postgres both fail on a cache miss the
 * lookup throws `ServiceClientCacheUnavailableError`. The admission gate
 * MUST translate this into 503 `Retry-After: 1`; admitting on empty state
 * is explicitly forbidden by the spec ("admit on stale or absent metadata"
 * is the failure-mode that breaks the security floor).
 *
 * Local fast-path: `invalidate(clientId)` after every PG-committed
 * mutation deletes the Redis key AND publishes on
 * `alkemio:svc:cache-invalidation` so peer replicas can evict their
 * in-memory LRU before the 60 s TTL expires. Replicas that miss the
 * pub/sub due to a transient disconnect catch up at the next TTL expiry —
 * the contract holds either way.
 */

export const SERVICE_CLIENT_CACHE_REDIS_HANDLE = Symbol(
  'SERVICE_CLIENT_CACHE_REDIS_HANDLE'
);
export const SERVICE_CLIENT_CACHE_SUBSCRIBER_HANDLE = Symbol(
  'SERVICE_CLIENT_CACHE_SUBSCRIBER_HANDLE'
);

export const SERVICE_CLIENT_CACHE_TTL_SECONDS = 60;
export const SERVICE_CLIENT_CACHE_LOCAL_TTL_MS = 5_000;
export const SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL =
  'alkemio:svc:cache-invalidation';

export const serviceClientCacheKey = (clientId: string): string =>
  `alkemio:svc:client:${clientId}`;

export type ServiceClientStatus = 'enabled' | 'disabled';
export type ServiceClientTokenEndpointAuthMethod =
  | 'client_secret_basic'
  | 'client_secret_post';

export interface CachedServiceClient {
  status: ServiceClientStatus;
  scopes: string[];
  audience: string;
  accessTokenLifetimeSeconds: number;
  tokenEndpointAuthMethod: ServiceClientTokenEndpointAuthMethod;
}

interface LocalEntry {
  value: CachedServiceClient | null;
  expiresAt: number;
}

export class ServiceClientCacheUnavailableError extends Error {
  constructor(
    public readonly clientId: string,
    public readonly cause?: unknown
  ) {
    super(`service_client_cache_unavailable:${clientId}`);
    this.name = 'ServiceClientCacheUnavailableError';
  }
}

@Injectable()
export class ServiceClientCacheService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ServiceClientCacheService.name);
  private readonly localLru = new Map<string, LocalEntry>();

  constructor(
    @Inject(SERVICE_CLIENT_CACHE_REDIS_HANDLE)
    private readonly redis: Redis,
    @Inject(SERVICE_CLIENT_CACHE_SUBSCRIBER_HANDLE)
    private readonly subscriber: Redis,
    @InjectRepository(ServiceClient)
    private readonly serviceClientRepo: Repository<ServiceClient>
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.subscriber.subscribe(
        SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL
      );
      this.subscriber.on('message', (channel, message) => {
        if (channel !== SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL) return;
        // The publisher already DELed the Redis key; we only evict our
        // in-process LRU layer so the next request reads fresh.
        this.localLru.delete(message);
      });
    } catch (err) {
      this.logger.warn(
        `Failed to subscribe to ${SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(
        SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL
      );
    } catch {
      // best-effort — module is going down anyway.
    }
  }

  /**
   * Returns the cached principal metadata for `clientId`, or `null` if the
   * catalogue has no row for it (admission gate treats this as
   * unauthenticated). Throws `ServiceClientCacheUnavailableError` if both
   * Redis AND Postgres fail (fail-closed).
   */
  async lookup(clientId: string): Promise<CachedServiceClient | null> {
    // Tier 1: in-memory LRU — latency optimisation only.
    const localHit = this.readLocal(clientId);
    if (localHit !== undefined) return localHit;

    // Tier 2: Redis.
    let redisErr: unknown = null;
    try {
      const raw = await this.redis.get(serviceClientCacheKey(clientId));
      if (raw !== null) {
        const parsed = JSON.parse(raw) as CachedServiceClient;
        this.writeLocal(clientId, parsed);
        return parsed;
      }
    } catch (err) {
      redisErr = err;
      this.logger.warn(
        `Redis lookup failed for clientId=${clientId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // Tier 3: Postgres. Fail closed if PG ALSO fails.
    let row: ServiceClient | null;
    try {
      row = await this.serviceClientRepo.findOne({
        where: { clientId },
        relations: { scopes: true },
      });
    } catch (err) {
      throw new ServiceClientCacheUnavailableError(clientId, err);
    }

    if (row === null) {
      // Negative cache: do NOT write to Redis (avoids cache-poisoning on
      // typo-clientIds). Pin a short local negative entry so a burst of
      // repeat lookups doesn't hammer PG.
      this.writeLocal(clientId, null);
      return null;
    }

    const cached: CachedServiceClient = {
      status: row.status,
      scopes: (row.scopes ?? []).map(s => s.scopeName),
      audience: row.audience,
      accessTokenLifetimeSeconds: row.accessTokenLifetimeSeconds,
      tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    };

    // Best-effort Redis writeback. If Redis is the failing tier, we still
    // serve the PG read so the admission gate doesn't collapse — but we
    // skip the cache-set to avoid masking the outage in subsequent calls.
    if (redisErr === null) {
      try {
        await this.redis.set(
          serviceClientCacheKey(clientId),
          JSON.stringify(cached),
          'EX',
          SERVICE_CLIENT_CACHE_TTL_SECONDS
        );
      } catch (err) {
        this.logger.warn(
          `Redis set failed for clientId=${clientId}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    this.writeLocal(clientId, cached);
    return cached;
  }

  /**
   * Post-commit fast-path invalidation: DEL the Redis key, drop the local
   * LRU entry, and broadcast on the pub/sub channel so peer replicas
   * evict their in-memory layer before the next 60 s tick.
   */
  async invalidate(clientId: string): Promise<void> {
    this.localLru.delete(clientId);
    try {
      await this.redis.del(serviceClientCacheKey(clientId));
    } catch (err) {
      this.logger.warn(
        `Redis del failed for clientId=${clientId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
    try {
      await this.redis.publish(
        SERVICE_CLIENT_CACHE_INVALIDATION_CHANNEL,
        clientId
      );
    } catch (err) {
      this.logger.warn(
        `Redis publish failed for clientId=${clientId}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  private readLocal(clientId: string): CachedServiceClient | null | undefined {
    const entry = this.localLru.get(clientId);
    if (entry === undefined) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.localLru.delete(clientId);
      return undefined;
    }
    return entry.value;
  }

  private writeLocal(
    clientId: string,
    value: CachedServiceClient | null
  ): void {
    this.localLru.set(clientId, {
      value,
      expiresAt: Date.now() + SERVICE_CLIENT_CACHE_LOCAL_TTL_MS,
    });
  }
}
