import { createRedisClient } from '@core/redis/redis.client.factory';
import { LoggerService, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HEALTH_JWKS_HANDLE, HEALTH_REDIS_HANDLE } from './health.tokens';
import { createJwksFreshnessHandle } from './jwks-freshness';

// FR-036a — HealthModule owns its own Redis client (a thin connection used
// only for `PING`) and its own JWKS-with-freshness wrapper. This avoids
// coupling to OidcModule's session-store handle (which abstracts away the
// raw Redis client) and lets the health probes survive even if OidcModule
// is reconfigured.
//
// The JWKS wrapper here is INDEPENDENT of the JWKS that
// `HydraBearerStrategy` uses for actual JWT verification — both call the
// same Hydra `/.well-known/jwks.json` endpoint with the same caching
// semantics, so the freshness signal here mirrors the production verifier.
// We could share the wrapper across modules, but two cheap caches are
// cheaper than a cross-module dependency for a probe surface.
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: HEALTH_REDIS_HANDLE,
      inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
      useFactory: (
        configService: ConfigService<AlkemioConfig, true>,
        logger: LoggerService
      ) => {
        // server#6332 — this client was already correct; it was the ONLY one
        // that was. Its four options are now the factory's defaults, so it is
        // built through the factory purely so that no `new Redis()` survives
        // outside it (FR-007, SC-009). A second correct hand-rolled client is
        // exactly how the next incorrect one gets written.
        //
        // `lazyConnect` stays, expressed as a factory option rather than by
        // bypassing the factory (FR-014): a Redis outage at boot must not crash
        // the probe surface — the PING in HealthService surfaces as `unhealthy`
        // until the connection comes back. Note the cost that option carries:
        // combined with `enableOfflineQueue: false` the FIRST command fails
        // unconditionally, which a probe that re-runs tolerates and the request
        // path would not. Hence opt-in.
        return createRedisClient(
          configService.get('storage.redis', { infer: true }),
          logger,
          { purpose: 'health', lazyConnect: true }
        );
      },
    },
    {
      provide: HEALTH_JWKS_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { jwks_url } = configService.get(
          'identity.authentication.providers.oidc',
          { infer: true }
        );
        return createJwksFreshnessHandle(new URL(jwks_url));
      },
    },
  ],
})
export class HealthModule {}
