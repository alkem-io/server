import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import Redis from 'ioredis';

/**
 * DI token for the shared ioredis client used by the messaging-notifications
 * atomic primitives (034-messaging-notifications):
 *  - the shared push-throttle bucket (D-7 fix — atomic INCR + EXPIRE,
 *    replacing the broken cache-manager get/set that never reliably applied
 *    a TTL and raced across replicas)
 *  - the messaging push budget (D-9, disjoint key namespace)
 *  - the per-message dedupe marker (D-12)
 *  - the per-recipient email suppression window marker (D-8)
 *
 * A single dedicated client (rather than reusing the CacheModule's
 * cache-manager-redis-store abstraction) is used deliberately: these
 * primitives need raw atomic Redis commands (INCR/EXPIRE, SET NX) which
 * cache-manager's `Cache` interface does not expose safely — this is exactly
 * the bug being fixed. Follows the same "own dedicated ioredis client via
 * `storage.redis` config" convention already used by HealthModule,
 * OidcModule's session store, and the auth-reset worker.
 */
export const MESSAGING_REDIS_CLIENT = 'MESSAGING_REDIS_CLIENT';

export const messagingRedisClientProvider: Provider = {
  provide: MESSAGING_REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
    const { host, port } = configService.get('storage.redis', {
      infer: true,
    });
    return new Redis({
      host,
      port: Number(port),
      // Lazy-connect so a Redis outage at boot doesn't crash the app — the
      // atomic primitives that use this client all fail OPEN (D-10): a
      // connection error is caught and logged, and the notification is sent.
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
  },
};
