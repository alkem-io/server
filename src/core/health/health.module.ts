import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { AlkemioConfig } from '@src/types';
import Redis from 'ioredis';
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
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port } = configService.get('storage.redis', {
          infer: true,
        });
        // Lazy-connect so a Redis outage at boot doesn't crash the probe
        // surface — the PING in HealthService will surface as `unhealthy`
        // until the connection comes back.
        return new Redis({
          host,
          port: Number(port),
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          connectTimeout: 500,
          enableOfflineQueue: false,
        });
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
