import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import Redis from 'ioredis';

import { ServiceClient } from '../entities/service-client.entity';
import { RevokedBearerBlocklistService } from './revoked-bearer-blocklist.service';
import {
  REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE,
  SERVICE_CLIENT_BLOCKLIST_REDIS_HANDLE,
} from './revoked-bearer-blocklist.tokens';
import {
  SERVICE_CLIENT_CACHE_REDIS_HANDLE,
  SERVICE_CLIENT_CACHE_SUBSCRIBER_HANDLE,
  ServiceClientCacheService,
} from './service-client-cache.service';

/**
 * 004 T029 — wires `ServiceClientCacheService` (admission cache) +
 * `RevokedBearerBlocklistService` (single-bearer revoke tombstones).
 *
 * Two ioredis connections are provisioned: a primary command client used
 * for GET/SET/DEL/PUBLISH AND a separate subscriber client used for the
 * `alkemio:svc:cache-invalidation` channel. Subscribing on the command
 * client would block all other Redis traffic on that connection per
 * Redis pub/sub semantics; ioredis docs explicitly recommend a dedicated
 * subscriber.
 *
 * Wired alongside `OidcModule`'s session-store Redis but with its own
 * client to keep failure domains independent — a flapping cache should
 * not take down session resolution.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ServiceClient])],
  providers: [
    {
      provide: SERVICE_CLIENT_CACHE_REDIS_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port } = configService.get('storage.redis', {
          infer: true,
        });
        return new Redis({ host, port: Number(port) });
      },
    },
    {
      provide: SERVICE_CLIENT_CACHE_SUBSCRIBER_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port } = configService.get('storage.redis', {
          infer: true,
        });
        return new Redis({ host, port: Number(port) });
      },
    },
    {
      provide: SERVICE_CLIENT_BLOCKLIST_REDIS_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port } = configService.get('storage.redis', {
          infer: true,
        });
        return new Redis({ host, port: Number(port) });
      },
    },
    // Alias for callers that prefer the more descriptive token. Keeps
    // backwards compatibility if other modules already import the
    // blocklist-namespaced handle directly.
    {
      provide: REVOKED_BEARER_BLOCKLIST_REDIS_HANDLE,
      inject: [SERVICE_CLIENT_BLOCKLIST_REDIS_HANDLE],
      useFactory: (redis: Redis) => redis,
    },
    ServiceClientCacheService,
    RevokedBearerBlocklistService,
  ],
  exports: [ServiceClientCacheService, RevokedBearerBlocklistService],
})
export class ServiceClientCacheModule {}
