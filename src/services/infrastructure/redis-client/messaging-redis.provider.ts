import { createRedisClient } from '@core/redis/redis.client.factory';
import { LoggerService, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * DI token for the shared ioredis client used by the messaging-notifications
 * runtime primitives (034-messaging-notifications):
 *  - the shared push-throttle bucket (D-7 fix — atomic INCR + EXPIRE on an
 *    epoch-minute-suffixed key, replacing the broken cache-manager get/set
 *    that never reliably applied a TTL and raced across replicas)
 *  - the per-message dedupe marker (D-12/FR-013)
 *  - the per-recipient digest scheduler state (R4/D-25): the due ZSET, the
 *    per-track pending conversation set, and the first-seen cap anchor
 *
 * A single dedicated client (rather than reusing the CacheModule's
 * cache-manager-redis-store abstraction) is used deliberately: these
 * primitives need raw atomic Redis commands (INCR/EXPIRE, SET NX, ZADD/ZREM,
 * and Lua) which cache-manager's `Cache` interface does not expose safely —
 * this is exactly the bug being fixed.
 *
 * Constructed through `createRedisClient` (server#6332) rather than
 * `new Redis(...)`: that factory is the single construction site for every
 * ioredis client in this repo, enforced by a structural guard test. Its
 * fail-fast options (`enableOfflineQueue: false`, `commandTimeout: 500`,
 * `connectTimeout: 500`, `maxRetriesPerRequest: 1`) are behavioural
 * constants, deliberately not configuration — and they are exactly right
 * here, because every messaging Redis call already fails OPEN (D-10). A
 * Redis outage therefore produces a fast error (and a notification that is
 * armed/sent anyway) instead of a multi-second hang on the message-ingestion
 * path.
 *
 * `lazyConnect` is kept so a Redis that is down at boot cannot crash the
 * application. Combined with `enableOfflineQueue: false` this means the very
 * FIRST command issued after boot fails (the client is still connecting) —
 * acceptable here precisely because every caller fails open: one message may
 * not arm its digest timer, and the next message on that track re-arms it
 * (FR-022 — pending state is a hint, counts are re-derived at fire time).
 */
export const MESSAGING_REDIS_CLIENT = 'MESSAGING_REDIS_CLIENT';

export const messagingRedisClientProvider: Provider = {
  provide: MESSAGING_REDIS_CLIENT,
  inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
  useFactory: (
    configService: ConfigService<AlkemioConfig, true>,
    logger: LoggerService
  ) => {
    const redisConfig = configService.get('storage.redis', {
      infer: true,
    });
    return createRedisClient(redisConfig, logger, {
      purpose: 'messaging',
      lazyConnect: true,
    });
  },
};
